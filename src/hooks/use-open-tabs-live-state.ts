"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  useOptionalConnectionStore,
  type ConnectionState,
} from "@/contexts/acp-connections-context"

/**
 * What a tab's live ACP connection adds to its persisted conversation status:
 * the agent is blocked on the user (a permission prompt, a question, a plan
 * approval), or it is mid-turn. `null` when neither — including a tab this
 * client has no connection for, which is every restored tab until it is first
 * shown (see `tab-first-show-auto-connect.test.tsx`).
 */
export type TabLiveState = "needs_input" | "prompting" | null

export function tabLiveState(conn: ConnectionState | undefined): TabLiveState {
  if (!conn) return null
  if (
    conn.pendingPermission ||
    conn.pendingAskQuestion ||
    conn.pendingPlanApproval ||
    conn.pendingQuestion
  ) {
    return "needs_input"
  }
  return conn.status === "prompting" ? "prompting" : null
}

const noopUnsubscribe = () => {}

/**
 * One tab's live state. The snapshot is the derived primitive, not the
 * connection object, so a streaming token (a new `liveMessage` on every delta)
 * does not re-render the caller — only a change of state does. Outside
 * `AcpConnectionsProvider` it is always `null`.
 */
export function useTabLiveState(tabId: string): TabLiveState {
  const store = useOptionalConnectionStore()
  const subscribe = useCallback(
    (cb: () => void) =>
      store ? store.subscribeKey(tabId, cb) : noopUnsubscribe,
    [store, tabId]
  )
  const getSnapshot = useCallback(
    () => (store ? tabLiveState(store.getConnection(tabId)) : null),
    [store, tabId]
  )
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Whether any of `tabIds` has an agent blocked on the user. */
export function useAnyTabNeedsInput(tabIds: readonly string[]): boolean {
  const store = useOptionalConnectionStore()
  // A string key keeps the callbacks stable while the caller rebuilds an equal
  // id array on every render.
  const key = tabIds.join("\n")
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!store || !key) return noopUnsubscribe
      const unsubscribes = key
        .split("\n")
        .map((id) => store.subscribeKey(id, cb))
      return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
    },
    [store, key]
  )
  const getSnapshot = useCallback(
    () =>
      !!store &&
      !!key &&
      key
        .split("\n")
        .some((id) => tabLiveState(store.getConnection(id)) === "needs_input"),
    [store, key]
  )
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
