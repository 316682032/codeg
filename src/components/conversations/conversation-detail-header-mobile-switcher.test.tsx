import { type ReactElement } from "react"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"

import enMessages from "@/i18n/messages/en.json"

// Fork-only (keh4l/codeg#10): on a phone the header's title is the open-tab
// switcher; at desktop widths it stays plain text beside the tab strip. Kept
// out of `conversation-detail-header.test.tsx` so that upstream file merges
// untouched.
const h = vi.hoisted(() => ({ isMobile: false }))

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => h.isMobile }))
vi.mock("./open-sessions-switcher", () => ({
  OpenSessionsSwitcher: ({ title }: { title: string }) => (
    <button type="button">switcher: {title}</button>
  ),
}))
vi.mock("@/lib/api", () => ({}))
vi.mock("@/contexts/tab-context", () => ({
  useTabActions: () => ({
    closeTab: vi.fn(),
    openNewConversationTab: vi.fn(),
  }),
}))
vi.mock("@/stores/app-workspace-store", () => {
  const state = {
    updateConversationLocal: vi.fn(),
    refreshConversations: vi.fn(),
    conversations: [] as unknown[],
  }
  const useStore = (selector: (s: typeof state) => unknown) => selector(state)
  useStore.getState = () => state
  return { useAppWorkspaceStore: useStore }
})
vi.mock("@/stores/conversation-runtime-store", () => ({
  getRuntimeSession: () => null,
}))
vi.mock("./session-details-dialog", () => ({
  SessionDetailsDialog: () => null,
}))
vi.mock("@/components/chat/conversation-context-bar", () => ({
  ConversationHeaderFolderPicker: () => null,
}))

import { ConversationDetailHeader } from "./conversation-detail-header"

function withIntl(ui: ReactElement) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const props = {
  tabId: "tab-a",
  conversationId: 1,
  runtimeConversationId: null,
  folderId: 1,
  folderPath: "/a",
  title: "conv-a",
  status: "in_progress" as const,
}

describe("ConversationDetailHeader title on a phone", () => {
  beforeEach(() => {
    h.isMobile = false
  })

  it("is plain text at desktop widths", () => {
    render(withIntl(<ConversationDetailHeader {...props} />))
    expect(screen.getByText("conv-a")).toBeInTheDocument()
    expect(screen.queryByText(/switcher:/)).toBeNull()
  })

  it("is the open-tab switcher on a phone", async () => {
    h.isMobile = true
    render(withIntl(<ConversationDetailHeader {...props} />))
    expect(
      await screen.findByRole("button", { name: "switcher: conv-a" })
    ).toBeInTheDocument()
  })
})
