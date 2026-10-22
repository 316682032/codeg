import { type ReactElement } from "react"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"

import enMessages from "@/i18n/messages/en.json"
import type { TabItem } from "@/contexts/tab-context"

const h = vi.hoisted(() => ({
  tabs: [] as unknown[],
  activeTabId: "tab-a" as string | null,
  conns: new Map<string, unknown>(),
  listeners: new Set<() => void>(),
  switchTab: vi.fn(),
  closeTab: vi.fn(),
  pinTab: vi.fn(),
  openNewConversationTab: vi.fn(),
  openChatModeTab: vi.fn(),
  toggleSidebar: vi.fn(),
  sidebarOpen: false,
  activeFolder: { id: 1, path: "/work/dytools" } as {
    id: number
    path: string
  } | null,
}))

vi.mock("@/contexts/tab-context", () => {
  const state = () => ({ tabs: h.tabs, activeTabId: h.activeTabId })
  const useTabStore = <T,>(selector: (s: ReturnType<typeof state>) => T) =>
    selector(state())
  useTabStore.getState = state
  return {
    useTabStore,
    useTabActions: () => ({
      switchTab: h.switchTab,
      closeTab: h.closeTab,
      pinTab: h.pinTab,
      openNewConversationTab: h.openNewConversationTab,
      openChatModeTab: h.openChatModeTab,
    }),
  }
})
vi.mock("@/stores/app-workspace-store", () => {
  const state = {
    allFolders: [
      { id: 1, name: "dytools", alias: null, kind: "regular" },
      { id: 2, name: "admin-repo", alias: "admin", kind: "regular" },
      { id: 3, name: ".chat", alias: null, kind: "chat" },
    ],
    conversations: [{ id: 12, updated_at: new Date().toISOString() }],
  }
  return {
    useAppWorkspaceStore: <T,>(selector: (s: typeof state) => T) =>
      selector(state),
  }
})
vi.mock("@/contexts/active-folder-context", () => ({
  useActiveFolder: () => ({ activeFolder: h.activeFolder }),
}))
vi.mock("@/contexts/sidebar-context", () => ({
  useSidebarContext: () => ({
    isOpen: h.sidebarOpen,
    toggle: h.toggleSidebar,
  }),
}))
vi.mock("@/contexts/acp-connections-context", () => ({
  useOptionalConnectionStore: () => ({
    getConnection: (key: string) => h.conns.get(key),
    subscribeKey: (_key: string, cb: () => void) => {
      h.listeners.add(cb)
      return () => h.listeners.delete(cb)
    },
  }),
}))
// Translated titles are not what these tests are about.
vi.mock("@/hooks/use-translated-title", () => ({
  useTranslatedTitle: (title: string) => title,
  useConversationTitleLocked: () => false,
}))

import { OpenSessionsSwitcher } from "./open-sessions-switcher"

function tab(patch: Partial<TabItem> & { id: string }): TabItem {
  return {
    kind: "conversation",
    folderId: 1,
    conversationId: 1,
    agentType: "claude_code",
    title: patch.id,
    isPinned: true,
    ...patch,
  }
}

function setConn(key: string, conn: unknown) {
  h.conns.set(key, conn)
  h.listeners.forEach((cb) => cb())
}

function withIntl(ui: ReactElement) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("OpenSessionsSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.conns.clear()
    h.listeners.clear()
    h.sidebarOpen = false
    h.activeFolder = { id: 1, path: "/work/dytools" }
    h.activeTabId = "tab-a"
    h.tabs = [
      tab({ id: "tab-a", title: "Storyboard", status: "in_progress" }),
      tab({
        id: "tab-b",
        title: "Missing APIs",
        agentType: "codex",
        status: "pending_review",
        conversationId: 12,
      }),
      tab({
        id: "tab-c",
        title: "Export button",
        folderId: 2,
        status: "completed",
      }),
      tab({ id: "tab-d", title: "New conversation", conversationId: null }),
    ]
  })

  it("shows the title, a chevron and the open-tab count as one trigger", () => {
    render(withIntl(<OpenSessionsSwitcher title="Storyboard" />))
    const trigger = screen.getByRole("button", {
      name: "Switch open conversations (4 open)",
    })
    expect(trigger).toHaveTextContent("Storyboard")
    expect(trigger).toHaveTextContent("4")
  })

  it("hides the count when only one tab is open", () => {
    h.tabs = [tab({ id: "tab-a", title: "Storyboard" })]
    render(withIntl(<OpenSessionsSwitcher title="Storyboard" />))
    const trigger = screen.getByRole("button", {
      name: "Switch open conversations (1 open)",
    })
    expect(trigger).toHaveTextContent(/^Storyboard$/)
  })

  it("marks the trigger while ANOTHER tab waits on the user", () => {
    render(withIntl(<OpenSessionsSwitcher title="Storyboard" />))
    expect(screen.queryByTestId("open-sessions-attention")).toBeNull()

    // The tab on screen already shows its own prompt: no dot for it.
    act(() => setConn("tab-a", { pendingPermission: {} }))
    expect(screen.queryByTestId("open-sessions-attention")).toBeNull()

    act(() => setConn("tab-c", { pendingAskQuestion: {} }))
    expect(screen.getByTestId("open-sessions-attention")).toHaveTextContent(
      "Another conversation is waiting for you"
    )
  })

  it("lists every open tab in tab order, each with its status", async () => {
    const user = userEvent.setup()
    setConn("tab-c", { status: "connected", pendingPermission: {} })
    render(withIntl(<OpenSessionsSwitcher title="Storyboard" />))
    await user.click(screen.getByRole("button", { name: /Switch open/ }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Open conversations")).toBeInTheDocument()
    const rows = within(dialog).getAllByRole("listitem")
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/Storyboard.*dytools · Viewing.*In Progress/),
      expect.stringMatching(/Missing APIs.*dytools · now.*Review/),
      // A live prompt outranks the persisted status; the alias names the folder.
      expect.stringMatching(/Export button.*admin.*Needs you/),
      expect.stringMatching(/New conversation.*dytools.*Not sent/),
    ])
    expect(
      within(rows[0]).getByRole("button", { name: /Storyboard/ })
    ).toHaveAttribute("aria-current", "true")
    expect(
      within(rows[1]).getByRole("button", { name: /Missing APIs/ })
    ).not.toHaveAttribute("aria-current")
  })

  it("labels a folderless chat draft as a chat, with no stray separator", async () => {
    const user = userEvent.setup()
    h.activeTabId = "tab-chat"
    h.tabs = [
      ...h.tabs,
      tab({
        id: "tab-chat",
        title: "New chat",
        folderId: 0,
        conversationId: null,
        isChat: true,
      }),
    ]
    render(withIntl(<OpenSessionsSwitcher title="New chat" />))
    await user.click(screen.getByRole("button", { name: /Switch open/ }))
    const rows = within(await screen.findByRole("dialog")).getAllByRole(
      "listitem"
    )
    expect(within(rows[4]).getByText("Chat · Viewing")).toBeInTheDocument()
    expect(within(rows[4]).getByText("Not sent")).toBeInTheDocument()
  })

  it("switches to a row's tab and closes the drawer", async () => {
    const user = userEvent.setup()
    render(withIntl(<OpenSessionsSwitcher title="Storyboard" />))
    await user.click(screen.getByRole("button", { name: /Switch open/ }))
    const dialog = await screen.findByRole("dialog")

    await user.click(
      within(dialog).getByRole("button", { name: /Missing APIs/ })
    )

    expect(h.switchTab).toHaveBeenCalledWith("tab-b")
    expect(h.closeTab).not.toHaveBeenCalled()
  })

  it("closes a row's tab without switching to it", async () => {
    const user = userEvent.setup()
    render(withIntl(<OpenSessionsSwitcher title="Storyboard" />))
    await user.click(screen.getByRole("button", { name: /Switch open/ }))
    const rows = within(await screen.findByRole("dialog")).getAllByRole(
      "listitem"
    )

    await user.click(
      within(rows[2]).getByRole("button", { name: "Close Conversation" })
    )

    expect(h.closeTab).toHaveBeenCalledWith("tab-c")
    expect(h.switchTab).not.toHaveBeenCalled()
  })

  it("offers to keep a preview, which the next one opened would replace", async () => {
    h.tabs = [
      tab({ id: "tab-a", title: "Storyboard" }),
      tab({ id: "tab-b", title: "Missing APIs", isPinned: false }),
    ]
    const user = userEvent.setup()
    render(withIntl(<OpenSessionsSwitcher title="Storyboard" />))
    await user.click(screen.getByRole("button", { name: /Switch open/ }))
    const rows = within(await screen.findByRole("dialog")).getAllByRole(
      "listitem"
    )

    expect(
      within(rows[0]).queryByRole("button", { name: "Keep open" })
    ).toBeNull()
    await user.click(within(rows[1]).getByRole("button", { name: "Keep open" }))

    expect(h.pinTab).toHaveBeenCalledWith("tab-b")
    expect(h.switchTab).not.toHaveBeenCalled()
  })

  it("starts a new conversation in the active folder, or in chat mode", async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      withIntl(<OpenSessionsSwitcher title="Storyboard" />)
    )
    await user.click(screen.getByRole("button", { name: /Switch open/ }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "New",
      })
    )
    expect(h.openNewConversationTab).toHaveBeenCalledWith(1, "/work/dytools")
    unmount()

    h.activeFolder = null
    render(withIntl(<OpenSessionsSwitcher title="Storyboard" />))
    await user.click(screen.getByRole("button", { name: /Switch open/ }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "New",
      })
    )
    expect(h.openChatModeTab).toHaveBeenCalledTimes(1)
  })

  it("opens the sidebar for the full history", async () => {
    const user = userEvent.setup()
    render(withIntl(<OpenSessionsSwitcher title="Storyboard" />))
    await user.click(screen.getByRole("button", { name: /Switch open/ }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: /All conversations/,
      })
    )
    expect(h.toggleSidebar).toHaveBeenCalledTimes(1)
  })
})
