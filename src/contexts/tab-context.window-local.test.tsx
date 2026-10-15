import { act, render } from "@testing-library/react"
import { useEffect } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TabProvider, useTabContext } from "@/contexts/tab-context"
import {
  CONVERSATION_CHANGED_EVENT,
  TAB_SYNC_SETTINGS_CHANGED_EVENT,
  TABS_CHANGED_EVENT,
} from "@/lib/types"
import type {
  AgentType,
  ConversationChange,
  DbConversationSummary,
  FolderDetail,
  OpenedTab,
  TabSyncSettings,
  TabTarget,
  TabsChanged,
} from "@/lib/types"
import { resetTabSyncPrefs, saveTabSyncEnabled } from "@/lib/tab-sync-prefs"
import {
  resetAppWorkspaceStore,
  useAppWorkspaceStore,
} from "@/stores/app-workspace-store"
import { resetTabStore, useTabStore } from "@/stores/tab-store"

// The window-local tab set (the backend's tab sync switch off): what a window
// keeps when it should not follow the other windows on the same server — and
// how every window follows that switch when any client flips it.

const listOpenedTabsMock = vi.fn()
const saveOpenedTabsMock = vi.fn()
const filterLiveTabTargetsMock = vi.fn()
const getFolderConversationMock = vi.fn()
const getTabSyncSettingsMock = vi.fn()
const setTabSyncSettingsMock = vi.fn()
const subscribeMock = vi.fn()
const onTransportReconnectMock = vi.fn()
let tabsChangedHandler: ((change: TabsChanged) => void) | null = null
let conversationChangedHandler: ((change: ConversationChange) => void) | null =
  null
let tabSyncChangedHandler: ((settings: TabSyncSettings) => void) | null = null
let reconnectHandlers: (() => void)[] = []

/** What a WebSocket reconnect does: every registered re-read runs. */
function reconnect() {
  for (const handler of reconnectHandlers) handler()
}

vi.mock("next-intl", () => {
  const t = (key: string) => key
  return { useTranslations: () => t }
})

vi.mock("@/lib/api", () => ({
  listOpenedTabs: (...args: unknown[]) => listOpenedTabsMock(...args),
  saveOpenedTabs: (...args: unknown[]) => saveOpenedTabsMock(...args),
  filterLiveTabTargets: (...args: unknown[]) =>
    filterLiveTabTargetsMock(...args),
  getFolderConversation: (...args: unknown[]) =>
    getFolderConversationMock(...args),
  getTabSyncSettings: (...args: unknown[]) => getTabSyncSettingsMock(...args),
  setTabSyncSettings: (...args: unknown[]) => setTabSyncSettingsMock(...args),
}))

vi.mock("@/lib/platform", () => ({
  subscribe: (...args: unknown[]) => subscribeMock(...args),
  onTransportReconnect: (...args: unknown[]) =>
    onTransportReconnectMock(...args),
}))

vi.mock("@/contexts/workspace-context", () => ({
  useWorkspaceActions: () => ({ activateConversationPane: () => {} }),
}))

vi.mock("@/contexts/acp-connections-context", () => ({
  useAcpActions: () => ({ disconnect: async () => true }),
}))

vi.mock("@/hooks/use-sorted-available-agents", () => ({
  useSortedAvailableAgents: () => ({
    sortedTypes: ["codex" satisfies AgentType],
    fresh: true,
  }),
}))

vi.mock("@/lib/last-active-context-storage", () => ({
  loadLastActiveContext: () => null,
  saveLastActiveContext: () => {},
  clearLastActiveContext: () => {},
}))

const SESSION_TABS_KEY = "workspace:window-tabs:v1"
const LAST_TABS_KEY = "workspace:window-tabs:last:v1:main"

function folder(id: number): FolderDetail {
  return {
    id,
    name: `repo-${id}`,
    path: `/repo-${id}`,
    git_branch: null,
    default_agent_type: "codex",
    last_opened_at: "2026-05-24T00:00:00Z",
    sort_order: id,
    color: "blue",
    parent_id: null,
    kind: "regular",
    alias: null,
    group_id: null,
  }
}

function conversation(id: number, folderId = 1): DbConversationSummary {
  return {
    id,
    folder_id: folderId,
    title: `Conversation ${id}`,
    title_locked: false,
    agent_type: "codex",
    status: "completed",
    kind: "regular",
    model: null,
    git_branch: null,
    external_id: null,
    message_count: 1,
    child_count: 0,
    created_at: "2026-05-24T00:00:00Z",
    updated_at: "2026-05-24T00:00:00Z",
    pinned_at: null,
  }
}

function tabItem(conversationId: number, isActive = false): OpenedTab {
  return {
    id: 0,
    folder_id: 1,
    conversation_id: conversationId,
    agent_type: "codex",
    position: 0,
    is_active: isActive,
    is_pinned: true,
  }
}

function tabId(conversationId: number) {
  return `conv-1-codex-${conversationId}`
}

function storeWindowTabs(key: string, storage: Storage, items: OpenedTab[]) {
  storage.setItem(key, JSON.stringify(items))
}

function storedIds(storage: Storage, key: string): number[] {
  const raw = storage.getItem(key)
  if (!raw) return []
  return (JSON.parse(raw) as OpenedTab[]).map((it) => it.conversation_id!)
}

function conversationTabIds(): string[] {
  return useTabStore
    .getState()
    .rawTabs.filter((tab) => tab.conversationId != null)
    .map((tab) => tab.id)
}

let latestContext: ReturnType<typeof useTabContext> | null = null

function Probe() {
  const ctx = useTabContext()
  useEffect(() => {
    latestContext = ctx
  }, [ctx])
  return null
}

async function renderHydrated() {
  latestContext = null
  const view = render(
    <TabProvider>
      <Probe />
    </TabProvider>
  )
  // Hydrate (storage read + live check) and the async subscriptions.
  await act(async () => {})
  await act(async () => {})
  return view
}

/** Every live target the backend is asked about, unless told otherwise. */
function allLive() {
  filterLiveTabTargetsMock.mockImplementation(async (targets: TabTarget[]) =>
    targets.slice()
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  resetTabSyncPrefs()
  getTabSyncSettingsMock.mockResolvedValue({ enabled: false })
  setTabSyncSettingsMock.mockImplementation(async (s: TabSyncSettings) => s)
  resetAppWorkspaceStore()
  useAppWorkspaceStore.setState({
    conversations: [1, 2, 3, 4].map((id) => conversation(id)),
    conversationsLoading: false,
    folders: [folder(1)],
    allFolders: [folder(1)],
    foldersHydrated: true,
  })
  resetTabStore()
  allLive()
  listOpenedTabsMock.mockResolvedValue({ items: [], version: 0 })
  saveOpenedTabsMock.mockResolvedValue({ accepted: true, version: 1, tabs: [] })
  getFolderConversationMock.mockReturnValue(new Promise(() => {}))
  tabsChangedHandler = null
  conversationChangedHandler = null
  tabSyncChangedHandler = null
  reconnectHandlers = []
  subscribeMock.mockImplementation((event: string, handler: unknown) => {
    if (event === TABS_CHANGED_EVENT)
      tabsChangedHandler = handler as (change: TabsChanged) => void
    if (event === CONVERSATION_CHANGED_EVENT)
      conversationChangedHandler = handler as (
        change: ConversationChange
      ) => void
    if (event === TAB_SYNC_SETTINGS_CHANGED_EVENT)
      tabSyncChangedHandler = handler as (settings: TabSyncSettings) => void
    return Promise.resolve(() => {})
  })
  onTransportReconnectMock.mockImplementation((handler: () => void) => {
    reconnectHandlers.push(handler)
    return () => {}
  })
})

describe("TabProvider with tab sync off (window-local tabs)", () => {
  it("restores this window's own tabs and focus, not the shared set", async () => {
    storeWindowTabs(SESSION_TABS_KEY, sessionStorage, [
      tabItem(1),
      tabItem(2, true),
    ])
    storeWindowTabs(LAST_TABS_KEY, localStorage, [tabItem(3, true)])
    listOpenedTabsMock.mockResolvedValue({
      items: [tabItem(4, true)],
      version: 5,
    })

    await renderHydrated()

    expect(conversationTabIds()).toEqual([tabId(1), tabId(2)])
    expect(useTabStore.getState().activeTabId).toBe(tabId(2))
  })

  it("starts a window with no copy of its own from the most recent window's tabs", async () => {
    storeWindowTabs(LAST_TABS_KEY, localStorage, [tabItem(3, true)])

    const view = await renderHydrated()

    expect(conversationTabIds()).toEqual([tabId(3)])
    // Owned from the first load: another window moving on, then this one
    // reloading before any change of its own, still brings back its own set.
    expect(storedIds(sessionStorage, SESSION_TABS_KEY)).toEqual([3])
    storeWindowTabs(LAST_TABS_KEY, localStorage, [tabItem(1, true)])
    view.unmount()
    act(() => {
      resetTabStore()
    })
    await renderHydrated()

    expect(conversationTabIds()).toEqual([tabId(3)])
  })

  it("starts from the shared set once when nothing is stored anywhere", async () => {
    listOpenedTabsMock.mockResolvedValue({
      items: [tabItem(1), tabItem(2, true)],
      version: 9,
    })

    await renderHydrated()

    expect(conversationTabIds()).toEqual([tabId(1), tabId(2)])
    expect(useTabStore.getState().activeTabId).toBe(tabId(2))
    // Adopted as this window's own: the next load reads it from here.
    expect(storedIds(sessionStorage, SESSION_TABS_KEY)).toEqual([1, 2])
    expect(saveOpenedTabsMock).not.toHaveBeenCalled()
  })

  it("starts empty without storing anything when the shared set can't be read", async () => {
    listOpenedTabsMock.mockRejectedValue(new Error("backend down"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await renderHydrated()

    expect(conversationTabIds()).toEqual([])
    expect(sessionStorage.getItem(SESSION_TABS_KEY)).toBeNull()
  })

  it("drops tabs deleted while the window was away, and stores the pruned set", async () => {
    storeWindowTabs(SESSION_TABS_KEY, sessionStorage, [tabItem(1), tabItem(2)])
    filterLiveTabTargetsMock.mockImplementation(async (targets: TabTarget[]) =>
      targets.filter((t) => t.conversation_id !== 2)
    )

    await renderHydrated()

    expect(conversationTabIds()).toEqual([tabId(1)])
    expect(storedIds(sessionStorage, SESSION_TABS_KEY)).toEqual([1])
  })

  it("keeps every tab when the liveness check fails", async () => {
    storeWindowTabs(SESSION_TABS_KEY, sessionStorage, [tabItem(1), tabItem(2)])
    filterLiveTabTargetsMock.mockRejectedValue(new Error("offline"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await renderHydrated()

    expect(conversationTabIds()).toEqual([tabId(1), tabId(2)])
  })

  it("saves to this window's storage, not to the shared set", async () => {
    await renderHydrated()

    act(() => {
      latestContext?.openTab(1, 4, "codex", true, "Conversation 4")
    })

    expect(storedIds(sessionStorage, SESSION_TABS_KEY)).toEqual([4])
    expect(storedIds(localStorage, LAST_TABS_KEY)).toEqual([4])
    expect(saveOpenedTabsMock).not.toHaveBeenCalled()
  })

  it("ignores the shared set's broadcasts, including the server's", async () => {
    storeWindowTabs(SESSION_TABS_KEY, sessionStorage, [tabItem(1, true)])
    await renderHydrated()
    expect(tabsChangedHandler).not.toBeNull()

    act(() => {
      tabsChangedHandler?.({
        version: 5,
        origin: "other-window",
        tabs: [tabItem(2, true), tabItem(3)],
      })
      tabsChangedHandler?.({ version: 6, origin: "server", tabs: [] })
    })

    expect(conversationTabIds()).toEqual([tabId(1)])
    expect(useTabStore.getState().activeTabId).toBe(tabId(1))
  })

  it("closes the tab of a conversation deleted in another window", async () => {
    storeWindowTabs(SESSION_TABS_KEY, sessionStorage, [
      tabItem(1),
      tabItem(2, true),
    ])
    await renderHydrated()

    act(() => {
      conversationChangedHandler?.({ kind: "deleted", id: 2 })
    })

    expect(conversationTabIds()).toEqual([tabId(1)])
    expect(useTabStore.getState().activeTabId).toBe(tabId(1))
    expect(storedIds(sessionStorage, SESSION_TABS_KEY)).toEqual([1])
  })

  it("re-checks after a reconnect, sparing tabs opened while the check ran", async () => {
    storeWindowTabs(SESSION_TABS_KEY, sessionStorage, [tabItem(1), tabItem(2)])
    await renderHydrated()
    expect(reconnectHandlers.length).toBeGreaterThan(0)

    let answer: (live: TabTarget[]) => void = () => {}
    filterLiveTabTargetsMock.mockImplementationOnce(
      () => new Promise<TabTarget[]>((resolve) => (answer = resolve))
    )
    act(() => {
      reconnect()
    })
    act(() => {
      latestContext?.openTab(1, 3, "codex", true, "Conversation 3")
    })
    await act(async () => {
      answer([{ folder_id: 1, conversation_id: 1 }])
    })

    expect(conversationTabIds()).toEqual([tabId(1), tabId(3)])
  })

  it("joins the shared set when another client turns sync on, keeping the union of both sides", async () => {
    storeWindowTabs(SESSION_TABS_KEY, sessionStorage, [tabItem(1, true)])
    await renderHydrated()
    expect(tabSyncChangedHandler).not.toBeNull()
    listOpenedTabsMock.mockResolvedValue({
      items: [tabItem(2, true)],
      version: 7,
    })
    vi.useFakeTimers()
    try {
      await act(async () => {
        tabSyncChangedHandler?.({ enabled: true })
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })
    } finally {
      vi.useRealTimers()
    }

    expect(conversationTabIds()).toEqual([tabId(2), tabId(1)])
    // This window's own tab is still focused, and goes up to the server.
    expect(useTabStore.getState().activeTabId).toBe(tabId(1))
    expect(saveOpenedTabsMock).toHaveBeenCalledTimes(1)
    const [items, expectedVersion] = saveOpenedTabsMock.mock.calls[0]
    expect(
      (items as OpenedTab[]).map((it) => [it.conversation_id, it.is_active])
    ).toEqual([
      [2, false],
      [1, true],
    ])
    expect(expectedVersion).toBe(7)
  })

  it("keeps its tabs as its own when this window turns sync off", async () => {
    getTabSyncSettingsMock.mockResolvedValue({ enabled: true })
    listOpenedTabsMock.mockResolvedValue({
      items: [tabItem(1, true), tabItem(2)],
      version: 3,
    })
    await renderHydrated()
    expect(conversationTabIds()).toEqual([tabId(1), tabId(2)])

    // Saved for the whole backend; this window switches on the answer,
    // without waiting for its own broadcast.
    await act(async () => {
      await saveTabSyncEnabled(false)
    })
    expect(setTabSyncSettingsMock).toHaveBeenCalledWith({ enabled: false })
    expect(storedIds(sessionStorage, SESSION_TABS_KEY)).toEqual([1, 2])

    act(() => {
      tabsChangedHandler?.({ version: 4, origin: "other", tabs: [] })
      latestContext?.closeTab(tabId(2))
    })

    expect(conversationTabIds()).toEqual([tabId(1)])
    expect(storedIds(sessionStorage, SESSION_TABS_KEY)).toEqual([1])
    expect(saveOpenedTabsMock).not.toHaveBeenCalled()
  })
})

describe("TabProvider following the backend's tab sync switch", () => {
  it("uses the shared set when the backend has sync on, whatever this window stored", async () => {
    getTabSyncSettingsMock.mockResolvedValue({ enabled: true })
    storeWindowTabs(SESSION_TABS_KEY, sessionStorage, [tabItem(1, true)])
    listOpenedTabsMock.mockResolvedValue({
      items: [tabItem(2), tabItem(3, true)],
      version: 4,
    })

    await renderHydrated()

    expect(conversationTabIds()).toEqual([tabId(2), tabId(3)])
    expect(useTabStore.getState().activeTabId).toBe(tabId(3))
    // And it follows the other clients again.
    act(() => {
      tabsChangedHandler?.({
        version: 5,
        origin: "phone",
        tabs: [tabItem(2, true)],
      })
    })
    expect(conversationTabIds()).toEqual([tabId(2)])
    expect(useTabStore.getState().activeTabId).toBe(tabId(2))
  })

  it("falls back to the shared set when the switch can't be read, and moves once it can", async () => {
    getTabSyncSettingsMock.mockRejectedValue(new Error("backend down"))
    storeWindowTabs(SESSION_TABS_KEY, sessionStorage, [tabItem(1, true)])
    listOpenedTabsMock.mockResolvedValue({
      items: [tabItem(2, true)],
      version: 4,
    })

    await renderHydrated()
    expect(conversationTabIds()).toEqual([tabId(2)])

    // The reconnect re-read answers: sync is off on this backend. The window
    // keeps the tabs it has, as its own.
    getTabSyncSettingsMock.mockResolvedValue({ enabled: false })
    await act(async () => {
      reconnect()
    })
    await act(async () => {})
    expect(storedIds(sessionStorage, SESSION_TABS_KEY)).toEqual([2])
    act(() => {
      tabsChangedHandler?.({ version: 5, origin: "phone", tabs: [] })
    })
    expect(conversationTabIds()).toEqual([tabId(2)])
  })

  it("reads the switch once for the provider and hydration together", async () => {
    await renderHydrated()
    // One read on mount, one more once the broadcast subscription is live
    // (a save in between would otherwise go unheard) — not one per caller.
    expect(getTabSyncSettingsMock.mock.calls.length).toBeLessThanOrEqual(2)
  })
})
