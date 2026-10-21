// keh4l build: the image-generation row of Collaboration → In-conversation
// tools. Its value lives with the image settings, and saving it goes through
// the same tool-group writer as the status-bar popover.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({
  getFeedbackSettings: vi.fn(async () => ({ enabled: false })),
  setFeedbackSettings: vi.fn(),
  getQuestionSettings: vi.fn(async () => ({ enabled: true })),
  setQuestionSettings: vi.fn(),
  getSessionInfoSettings: vi.fn(async () => ({ enabled: true })),
  setSessionInfoSettings: vi.fn(),
  getBrowserToolsSettings: vi.fn(async () => ({ enabled: false, eval: false })),
  setBrowserToolsSettings: vi.fn(),
  getChatAuthoringSettings: vi.fn(async () => ({
    automations_enabled: false,
    work_tasks_enabled: false,
  })),
  setChatAuthoringSettings: vi.fn(),
  setCodegMcpToolGroup: vi.fn(async () => undefined),
}))
vi.mock("@/lib/computer/computer-api", () => ({
  getComputerToolsSettings: vi.fn(async () => ({ enabled: false })),
  setComputerToolsEnabled: vi.fn(),
  useComputerAvailable: () => false,
}))
const getImageGenSettings = vi.fn()
vi.mock("@/lib/image-gen/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image-gen/api")>()),
  getImageGenSettings: () => getImageGenSettings(),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const handlers = new Map<string, (p: unknown) => void>()
vi.mock("@/lib/platform", () => ({
  subscribe: vi.fn((event: string, handler: (p: unknown) => void) => {
    handlers.set(event, handler)
    return Promise.resolve(() => {})
  }),
}))
vi.mock("@/hooks/use-feedback-enabled", () => ({
  primeFeedbackEnabled: vi.fn(),
}))

import { AgentToolsSettingsSection } from "./agent-tools-settings"
import enMessages from "@/i18n/messages/en.json"
import { setCodegMcpToolGroup } from "@/lib/api"
import { IMAGE_GEN_SETTINGS_CHANGED_EVENT } from "@/lib/image-gen/api"

const LABEL = enMessages.AgentTools.image.label

function settings(enabled: boolean) {
  return {
    enabled,
    services: [],
    default_model: null,
    save_dir: "",
    default_save_dir: "/home/me/.codeg/generated-images",
    send_preview: true,
  }
}

function renderSection() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AgentToolsSettingsSection />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(setCodegMcpToolGroup).mockClear()
  getImageGenSettings.mockReset()
  handlers.clear()
})

describe("the image-generation row", () => {
  it("reads the switch from the image settings and saves it alone", async () => {
    getImageGenSettings.mockResolvedValue(settings(false))
    renderSection()

    const toggle = await screen.findByLabelText(LABEL)
    await waitFor(() =>
      expect(toggle).toHaveAttribute("data-state", "unchecked")
    )
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(setCodegMcpToolGroup).toHaveBeenCalledWith("image", true)
    )
    expect(setCodegMcpToolGroup).toHaveBeenCalledTimes(1)
  })

  it("follows a save made on the image settings page", async () => {
    getImageGenSettings.mockResolvedValue(settings(false))
    renderSection()

    const toggle = await screen.findByLabelText(LABEL)
    await waitFor(() =>
      expect(handlers.has(IMAGE_GEN_SETTINGS_CHANGED_EVENT)).toBe(true)
    )
    act(() => handlers.get(IMAGE_GEN_SETTINGS_CHANGED_EVENT)!(settings(true)))
    expect(toggle).toHaveAttribute("data-state", "checked")
    // Not an edit of the user's: nothing to save.
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("links to the image settings page", async () => {
    getImageGenSettings.mockResolvedValue(settings(false))
    renderSection()
    expect(
      await screen.findByRole("button", {
        name: enMessages.AgentToolsSettings.configureImage,
      })
    ).toBeInTheDocument()
  })
})
