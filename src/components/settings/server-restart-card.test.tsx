import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import enMessages from "@/i18n/messages/en.json"
import type { ServerUpdateStatus } from "@/lib/updater"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
  },
}))

const getServerUpdateStatus = vi.fn<() => Promise<ServerUpdateStatus | null>>()
const waitForServerHealthy = vi.fn<() => Promise<boolean>>()
const endOwnRestart = vi.fn()
vi.mock("@/lib/updater", () => ({
  getServerUpdateStatus: () => getServerUpdateStatus(),
  waitForServerHealthy: () => waitForServerHealthy(),
  beginOwnServerRestart: () => endOwnRestart,
}))

const restartServer = vi.fn()
vi.mock("@/lib/server-restart", () => ({
  restartServer: () => restartServer(),
}))

const acpListConnections = vi.fn()
vi.mock("@/lib/api", () => ({
  acpListConnections: () => acpListConnections(),
}))

let updateBusy = false
vi.mock("@/components/providers/update-provider", () => ({
  useAppUpdate: () => ({ isBusy: updateBusy }),
}))

import { ServerRestartCard } from "./server-restart-card"

const t = enMessages.ServerRestart

function status(over: Partial<ServerUpdateStatus> = {}): ServerUpdateStatus {
  return {
    currentVersion: "0.39.0",
    selfUpdateSupported: true,
    capability: "supervised",
    runtime: "docker",
    restartDelayMs: 2000,
    rollbackAvailable: false,
    restartSupported: true,
    ...over,
  }
}

function renderCard() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ServerRestartCard />
    </NextIntlClientProvider>
  )
}

const reload = vi.fn()

beforeEach(() => {
  updateBusy = false
  getServerUpdateStatus.mockResolvedValue(status())
  waitForServerHealthy.mockResolvedValue(true)
  restartServer.mockResolvedValue({
    restartDelayMs: 0,
    capability: "supervised",
  })
  acpListConnections.mockResolvedValue([])
  vi.stubGlobal("location", { ...window.location, reload })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

/** Open the dialog from the card and confirm it. */
async function confirmRestart() {
  fireEvent.click(await screen.findByRole("button", { name: t.button }))
  const dialog = await screen.findByRole("alertdialog")
  await act(async () => {
    fireEvent.click(
      Array.from(dialog.querySelectorAll("button")).find(
        (b) => b.textContent === t.confirm
      )!
    )
  })
}

describe("ServerRestartCard", () => {
  it("shows nothing in a desktop window", async () => {
    getServerUpdateStatus.mockResolvedValue(null)
    const { container } = renderCard()
    await waitFor(() => expect(getServerUpdateStatus).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it("shows nothing on a server that can't restart itself", async () => {
    // A browser on a desktop's web service, Windows, or an older server
    // that doesn't report it at all.
    for (const restartSupported of [false, undefined]) {
      getServerUpdateStatus.mockResolvedValue(status({ restartSupported }))
      const { container, unmount } = renderCard()
      await waitFor(() => expect(getServerUpdateStatus).toHaveBeenCalled())
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
  })

  it("says how this server restarts", async () => {
    renderCard()
    expect(await screen.findByText(t.title)).toBeInTheDocument()
    expect(screen.getByText(t.methodSupervised)).toBeInTheDocument()
  })

  it("waits while an update is taking the server down", async () => {
    updateBusy = true
    renderCard()
    expect(await screen.findByRole("button", { name: t.button })).toBeDisabled()
  })

  it("warns how many running conversations a restart interrupts", async () => {
    acpListConnections.mockResolvedValue([
      { id: "a", agent_type: "claude_code", status: "prompting" },
      { id: "b", agent_type: "codex", status: "prompting" },
      { id: "c", agent_type: "codex", status: "connected" },
    ])
    renderCard()
    fireEvent.click(await screen.findByRole("button", { name: t.button }))

    expect(
      await screen.findByText(/2 conversations are running/)
    ).toBeInTheDocument()
    expect(restartServer).not.toHaveBeenCalled()
  })

  it("restarts, waits for the server, then reloads the page", async () => {
    renderCard()
    await confirmRestart()

    await waitFor(() => expect(reload).toHaveBeenCalled())
    expect(restartServer).toHaveBeenCalledTimes(1)
    expect(waitForServerHealthy).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(t.done)
    // The page is going away; its "server changed" notice stays quiet.
    expect(endOwnRestart).not.toHaveBeenCalled()
  })

  it("shows the wait while the server is on its way back", async () => {
    let comeBack: (up: boolean) => void = () => {}
    waitForServerHealthy.mockReturnValue(
      new Promise((resolve) => {
        comeBack = resolve
      })
    )
    renderCard()
    await confirmRestart()

    expect(await screen.findByText(t.waiting)).toBeInTheDocument()
    await act(async () => comeBack(true))
    await waitFor(() => expect(reload).toHaveBeenCalled())
  })

  it("says so when the restart is refused, and stays", async () => {
    restartServer.mockRejectedValue(
      new Error("An update operation is already in progress")
    )
    renderCard()
    await confirmRestart()

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Restart failed: An update operation is already in progress"
      )
    )
    expect(waitForServerHealthy).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    expect(endOwnRestart).toHaveBeenCalled()
    expect(screen.getByRole("button", { name: t.button })).toBeEnabled()
  })

  it("says another update or restart got there first", async () => {
    restartServer.mockRejectedValue({
      code: "already_exists",
      message: "An update operation is already in progress",
    })
    renderCard()
    await confirmRestart()

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(t.busy))
    expect(reload).not.toHaveBeenCalled()
  })

  it("says so when the server doesn't come back in time", async () => {
    waitForServerHealthy.mockResolvedValue(false)
    renderCard()
    await confirmRestart()

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(t.timeout))
    expect(reload).not.toHaveBeenCalled()
    expect(endOwnRestart).toHaveBeenCalled()
  })
})
