import { useCallback, useEffect, useRef, type MouseEvent } from "react"

import { useTabStore } from "@/stores/tab-store"

/** How long the drawer waits for a second tap on the same row. */
export const DOUBLE_TAP_MS = 350

/**
 * Double-tap to keep a conversation open, on a phone (keh4l build,
 * keh4l/codeg#12).
 *
 * A tap on a sidebar row opens the conversation as a preview tab, which the
 * next one replaces; a double tap keeps it, as a double click does on the
 * desktop. On a phone the sidebar is a drawer, and it used to close on the
 * first tap — so the second tap landed on the conversation behind it and
 * every conversation opened from the list replaced the last.
 *
 * The returned click handler (for the list's wrapper) closes the drawer
 * `DOUBLE_TAP_MS` after a tap on a row instead; a second tap on the same row
 * within that keeps the conversation's tab and closes it at once. A tap
 * anywhere but a row does nothing, as before.
 */
export function useMobileConversationTap({
  isOpen,
  close,
}: {
  isOpen: boolean
  close: () => void
}) {
  const pending = useRef<{
    id: string
    timer: ReturnType<typeof setTimeout>
  } | null>(null)
  const latest = useRef({ isOpen, close })
  useEffect(() => {
    latest.current = { isOpen, close }
  })
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current.timer)
    },
    []
  )

  return useCallback((event: MouseEvent) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-conversation-id]"
    )
    const id = row?.dataset.conversationId
    if (!id) return
    const prev = pending.current
    pending.current = null
    if (prev) clearTimeout(prev.timer)
    // The drawer may have been closed some other way in the meantime (a
    // swipe, the backdrop); closing it again would reopen it.
    const closeIfOpen = () => {
      if (latest.current.isOpen) latest.current.close()
    }
    if (prev?.id === id) {
      keepConversationTab(Number(id))
      closeIfOpen()
      return
    }
    pending.current = {
      id,
      timer: setTimeout(() => {
        pending.current = null
        closeIfOpen()
      }, DOUBLE_TAP_MS),
    }
  }, [])
}

/** Pins the tab showing `conversationId` (the active one if it is). */
function keepConversationTab(conversationId: number) {
  const { rawTabs, activeTabId, pinTab } = useTabStore.getState()
  const tab =
    rawTabs.find(
      (t) => t.id === activeTabId && t.conversationId === conversationId
    ) ?? rawTabs.find((t) => t.conversationId === conversationId)
  if (tab) pinTab(tab.id)
}
