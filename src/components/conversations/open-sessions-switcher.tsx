"use client"

import { memo, useCallback, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  History,
  Loader2,
  Pin,
  SquarePen,
  X,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { AgentIcon } from "@/components/agent-icon"
import { ConversationStatusDot } from "@/components/conversations/conversation-status-dot"
import { formatRelative } from "@/components/conversations/sidebar-conversation-grouping"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useActiveFolder } from "@/contexts/active-folder-context"
import { useSidebarContext } from "@/contexts/sidebar-context"
import {
  useTabActions,
  useTabStore,
  type TabItem,
} from "@/contexts/tab-context"
import { useHistoryBackDismiss } from "@/hooks/use-history-back-dismiss"
import {
  useAnyTabNeedsInput,
  useTabLiveState,
} from "@/hooks/use-open-tabs-live-state"
import {
  useConversationTitleLocked,
  useTranslatedTitle,
} from "@/hooks/use-translated-title"
import { formatConversationTitle } from "@/lib/conversation-title"
import { useAppWorkspaceStore } from "@/stores/app-workspace-store"
import { cn } from "@/lib/utils"

/**
 * Mobile stand-in for the conversation tab strip (fork-only, keh4l/codeg#10).
 *
 * Phones (`useIsMobile`) render no tab strip — one conversation fills the
 * screen and its header shows "folder › title" — so the header's title becomes
 * this trigger: the title, a ⌄, and the open-tab count, with an amber dot while
 * ANOTHER open tab has an agent blocked on the user. It opens a bottom drawer
 * listing every open tab with its status, to switch to, close, or start a new
 * one, plus a way into the sidebar's full history.
 *
 * Rows keep the tab order (the desktop strip's, which ⌘1–9 also follows), never
 * a status sort: statuses change live, and a list that reorders while it is
 * open moves rows out from under the finger.
 *
 * Status comes from two places. The persisted conversation status reaches
 * every client (`conversation_status_changed`), so every row has one. Whether
 * an agent is waiting on the user only exists on a live connection, which this
 * client holds only for the tabs it has shown — the others show their persisted
 * status until opened once.
 */
export function OpenSessionsSwitcher({ title }: { title: string }) {
  const t = useTranslations("Folder.openSessions")
  const tSidebar = useTranslations("Folder.sidebar")
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const {
    switchTab,
    closeTab,
    pinTab,
    openNewConversationTab,
    openChatModeTab,
  } = useTabActions()
  const { activeFolder } = useActiveFolder()
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebarContext()
  const allFolders = useAppWorkspaceStore((s) => s.allFolders)
  const [open, setOpen] = useState(false)
  // One "now" for every row's relative time, taken as the drawer opens.
  const [now, setNow] = useState(() => Date.now())

  const close = useCallback(() => setOpen(false), [])
  // A state toggle, not a route: without this the back gesture would unload
  // the page instead of closing the drawer (see the mobile drawers in
  // workspace/layout.tsx).
  useHistoryBackDismiss(open, close)

  const handleOpenChange = useCallback((next: boolean) => {
    if (next) setNow(Date.now())
    setOpen(next)
  }, [])

  const otherTabIds = useMemo(
    () => tabs.filter((tab) => tab.id !== activeTabId).map((tab) => tab.id),
    [tabs, activeTabId]
  )
  const othersNeedInput = useAnyTabNeedsInput(otherTabIds)

  const folderLabels = useMemo(() => {
    const map = new Map<number, string>()
    for (const folder of allFolders) {
      map.set(
        folder.id,
        folder.kind === "chat"
          ? tSidebar("sectionChats")
          : folder.alias?.trim() || folder.name
      )
    }
    return map
  }, [allFolders, tSidebar])

  const handleSelect = useCallback(
    (tabId: string) => {
      switchTab(tabId)
      setOpen(false)
    },
    [switchTab]
  )

  const handleClose = useCallback(
    (tabId: string) => {
      closeTab(tabId)
      if (useTabStore.getState().tabs.length === 0) setOpen(false)
    },
    [closeTab]
  )

  // Same as the top bar's new-conversation button: the active folder, or
  // folderless chat mode when there is none.
  const handleNew = useCallback(() => {
    setOpen(false)
    if (!activeFolder) {
      openChatModeTab()
      return
    }
    openNewConversationTab(activeFolder.id, activeFolder.path)
  }, [activeFolder, openChatModeTab, openNewConversationTab])

  const handleAllConversations = useCallback(() => {
    setOpen(false)
    if (!sidebarOpen) toggleSidebar()
  }, [sidebarOpen, toggleSidebar])

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      swipeDirection="down"
      // Navigation, like the other mobile drawers: tapping the page above it
      // puts it away.
      disablePointerDismissal={false}
      showSwipeHandle
    >
      <DrawerTrigger
        className="-mx-1 flex min-w-0 max-w-max flex-1 items-center gap-1 rounded-md px-1 py-1 text-sm text-foreground/90 outline-none active:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={t("trigger", { count: tabs.length })}
        title={title}
      >
        <span className="min-w-0 truncate">{title}</span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        {tabs.length > 1 ? (
          <span className="relative inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
            {tabs.length}
            {othersNeedInput ? (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-2 w-2"
                data-testid="open-sessions-attention"
              >
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background" />
                <span className="sr-only">{t("othersNeedInput")}</span>
              </span>
            ) : null}
          </span>
        ) : null}
      </DrawerTrigger>
      <DrawerContent showCloseButton={false} className="max-h-[75dvh] p-0">
        <div className="flex shrink-0 items-center gap-2 px-4 pt-1 pb-2">
          <DrawerTitle className="flex min-w-0 items-baseline gap-1.5">
            {t("title")}
            <span className="text-sm font-normal tabular-nums text-muted-foreground">
              {tabs.length}
            </span>
          </DrawerTitle>
          <button
            type="button"
            onClick={handleNew}
            className="ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-foreground active:bg-muted/70"
          >
            <SquarePen className="h-3.5 w-3.5" aria-hidden />
            {tSidebar("newConversationShort")}
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
          {tabs.map((tab) => (
            <OpenSessionRow
              key={tab.id}
              tab={tab}
              active={tab.id === activeTabId}
              folderLabel={
                // A chat-mode draft has no folder yet; once sent, its hidden
                // chat folder maps to the same label.
                tab.isChat
                  ? tSidebar("sectionChats")
                  : (folderLabels.get(tab.folderId) ?? "")
              }
              now={now}
              onSelect={handleSelect}
              onKeep={pinTab}
              onClose={handleClose}
            />
          ))}
        </ul>
        <div className="shrink-0 border-t border-border/60 px-2 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleAllConversations}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-3 text-sm text-foreground/80 active:bg-muted"
          >
            <History className="h-4 w-4 shrink-0" aria-hidden />
            {t("allConversations")}
            <ChevronRight
              className="ml-auto h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const OpenSessionRow = memo(function OpenSessionRow({
  tab,
  active,
  folderLabel,
  now,
  onSelect,
  onKeep,
  onClose,
}: {
  tab: TabItem
  active: boolean
  folderLabel: string
  now: number
  onSelect: (tabId: string) => void
  onKeep: (tabId: string) => void
  onClose: (tabId: string) => void
}) {
  const t = useTranslations("Folder.openSessions")
  const tCard = useTranslations("Folder.conversationCard")
  const tConv = useTranslations("Folder.conversation")
  const title =
    useTranslatedTitle(
      formatConversationTitle(tab.title),
      useConversationTitleLocked(tab.conversationId)
    ) || tCard("untitledConversation")
  const updatedAt = useAppWorkspaceStore((s) =>
    tab.conversationId == null
      ? null
      : (s.conversations.find((c) => c.id === tab.conversationId)?.updated_at ??
        null)
  )
  const live = useTabLiveState(tab.id)
  const detail = [
    folderLabel,
    active ? t("viewing") : updatedAt ? formatRelative(updatedAt, now) : "",
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <li
      className={cn("flex items-center gap-1 rounded-xl", active && "bg-muted")}
    >
      <button
        type="button"
        onClick={() => onSelect(tab.id)}
        aria-current={active ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2.5 pl-2.5 text-left active:bg-muted/70"
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <AgentIcon agentType={tab.agentType} className="h-4 w-4" />
          <ConversationStatusDot
            status={tab.status}
            className="absolute -right-0.5 -bottom-0.5 ring-2 ring-popover"
          />
        </span>
        <span className="min-w-0 flex-1">
          {/* A preview — the next conversation opened from the list replaces
              it — leans, as its tab does on the desktop. */}
          <span
            className={cn(
              "block truncate text-sm",
              active && "font-semibold",
              !tab.isPinned && "[font-style:oblique]"
            )}
          >
            {title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {detail}
          </span>
        </span>
        <OpenSessionStatus tab={tab} live={live} />
      </button>
      {!tab.isPinned && (
        <button
          type="button"
          onClick={() => onKeep(tab.id)}
          aria-label={t("keep")}
          title={t("keepHint")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 active:bg-muted active:text-foreground"
        >
          <Pin className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button
        type="button"
        onClick={() => onClose(tab.id)}
        aria-label={tConv("closeConversation")}
        title={tConv("closeConversation")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 active:bg-muted active:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </li>
  )
})

/**
 * A word for every state, not just a colour: blocked on the user, then
 * running (the persisted `in_progress`, or a live turn), then the persisted
 * status, and "not sent" for a draft.
 */
function OpenSessionStatus({
  tab,
  live,
}: {
  tab: TabItem
  live: ReturnType<typeof useTabLiveState>
}) {
  const t = useTranslations("Folder.openSessions")
  const tStatus = useTranslations("Folder.statusLabels")
  if (live === "needs_input") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
        <CircleAlert className="h-3 w-3" aria-hidden />
        {t("needsInput")}
      </span>
    )
  }
  if (live === "prompting" || tab.status === "in_progress") {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {tStatus("in_progress")}
      </span>
    )
  }
  if (tab.conversationId == null) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground">
        {t("draft")}
      </span>
    )
  }
  if (!tab.status) return null
  return (
    <span
      className={cn(
        "shrink-0 text-xs",
        tab.status === "pending_review" && "text-blue-600 dark:text-blue-400",
        tab.status === "completed" && "text-green-600 dark:text-green-400",
        tab.status === "cancelled" && "text-destructive"
      )}
    >
      {tStatus(tab.status)}
    </span>
  )
}
