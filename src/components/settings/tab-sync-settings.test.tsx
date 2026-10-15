import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

import { TabSyncSettingsSection } from "@/components/settings/tab-sync-settings"
import { resetTabSyncPrefs } from "@/lib/tab-sync-prefs"
import { TAB_SYNC_SETTINGS_CHANGED_EVENT } from "@/lib/types"
import type { TabSyncSettings } from "@/lib/types"

const h = vi.hoisted(() => ({
  getTabSyncSettings: vi.fn(),
  setTabSyncSettings: vi.fn(),
  handlers: new Map<string, (payload: unknown) => void>(),
}))

vi.mock("next-intl", () => {
  const t = (key: string, values?: Record<string, string>) =>
    values ? `${key}:${JSON.stringify(values)}` : key
  return { useTranslations: () => t }
})
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
vi.mock("@/lib/api", () => ({
  getTabSyncSettings: () => h.getTabSyncSettings(),
  setTabSyncSettings: (s: TabSyncSettings) => h.setTabSyncSettings(s),
}))
vi.mock("@/lib/platform", () => ({
  subscribe: (event: string, handler: (payload: unknown) => void) => {
    h.handlers.set(event, handler)
    return Promise.resolve(() => {})
  },
  onTransportReconnect: () => null,
}))

function switchEl() {
  return screen.getByRole("switch")
}

beforeEach(() => {
  vi.clearAllMocks()
  h.handlers.clear()
  resetTabSyncPrefs()
  h.getTabSyncSettings.mockResolvedValue({ enabled: true })
  h.setTabSyncSettings.mockImplementation(async (s: TabSyncSettings) => s)
})

describe("TabSyncSettingsSection", () => {
  it("is inert until the backend answers, then shows its value", async () => {
    let answer: (s: TabSyncSettings) => void = () => {}
    const pending = new Promise<TabSyncSettings>(
      (resolve) => (answer = resolve)
    )
    h.getTabSyncSettings.mockReturnValue(pending)
    render(<TabSyncSettingsSection />)
    expect(switchEl()).toBeDisabled()

    await act(async () => {
      answer({ enabled: false })
    })
    await waitFor(() => expect(switchEl()).not.toBeDisabled())
    expect(switchEl()).toHaveAttribute("aria-checked", "false")
  })

  it("saves for the whole backend", async () => {
    render(<TabSyncSettingsSection />)
    await waitFor(() => expect(switchEl()).not.toBeDisabled())
    expect(switchEl()).toHaveAttribute("aria-checked", "true")

    fireEvent.click(switchEl())

    await waitFor(() =>
      expect(switchEl()).toHaveAttribute("aria-checked", "false")
    )
    expect(h.setTabSyncSettings).toHaveBeenCalledWith({ enabled: false })
  })

  it("keeps the old value and says so when the save fails", async () => {
    h.setTabSyncSettings.mockRejectedValueOnce(new Error("offline"))
    render(<TabSyncSettingsSection />)
    await waitFor(() => expect(switchEl()).not.toBeDisabled())

    fireEvent.click(switchEl())

    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalled())
    expect(switchEl()).toHaveAttribute("aria-checked", "true")
  })

  it("follows a change saved on another client", async () => {
    render(<TabSyncSettingsSection />)
    await waitFor(() => expect(switchEl()).not.toBeDisabled())

    await act(async () => {
      h.handlers.get(TAB_SYNC_SETTINGS_CHANGED_EVENT)?.({ enabled: false })
    })

    expect(switchEl()).toHaveAttribute("aria-checked", "false")
  })
})
