import { useState } from "react"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, describe, expect, it, vi } from "vitest"

import enMessages from "@/i18n/messages/en.json"

// The create-task action pulls workbench-route + tab-store contexts this test
// doesn't mount.
vi.mock("./use-create-task-from-message", () => ({
  useCreateTaskFromMessage: () => () => {},
}))
const clipboard = vi.hoisted(() => ({ copied: [] as string[] }))
vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils")>()),
  copyTextToClipboard: async (text: string) => {
    clipboard.copied.push(text)
    return true
  },
}))
// The lookup itself is covered with the store in translation-context.test.
const originals: Record<string, string> = {
  "Please check the specs of this computer": "请检查这台电脑的配置",
}
vi.mock("./translation-context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./translation-context")>()),
  useSentOriginal: (sent: string) => {
    const [showing, setShowing] = useState(false)
    const original = originals[sent] ?? null
    return {
      original,
      showing: showing && original !== null,
      toggle: () => setShowing((on) => !on),
    }
  },
}))

import { UserMessageRow } from "./message-list-view"

const labels = enMessages.Folder.chat.messageList

function renderRow(text: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <UserMessageRow parts={[{ type: "text", text }]} />
    </NextIntlClientProvider>
  )
}

afterEach(() => {
  cleanup()
  clipboard.copied.length = 0
})

describe("a sent message the composer translated", () => {
  it("switches to what the user wrote, and copies that", async () => {
    renderRow("Please check the specs of this computer")
    expect(
      screen.getByText("Please check the specs of this computer")
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", { name: labels.showSentOriginal })
    )
    expect(screen.getByText("请检查这台电脑的配置")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: labels.showSent })
    ).toHaveAttribute("aria-pressed", "true")

    await userEvent.click(
      screen.getByRole("button", { name: labels.copyMessage })
    )
    expect(clipboard.copied).toEqual(["请检查这台电脑的配置"])
  })

  it("copies what was sent once switched back", async () => {
    renderRow("Please check the specs of this computer")
    await userEvent.click(
      screen.getByRole("button", { name: labels.showSentOriginal })
    )
    await userEvent.click(screen.getByRole("button", { name: labels.showSent }))
    expect(
      screen.getByText("Please check the specs of this computer")
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: labels.copyMessage })
    )
    expect(clipboard.copied).toEqual([
      "Please check the specs of this computer",
    ])
  })

  it("offers no switch for a message sent as written", () => {
    renderRow("Typed in English")
    expect(
      screen.queryByRole("button", { name: labels.showSentOriginal })
    ).toBeNull()
  })
})
