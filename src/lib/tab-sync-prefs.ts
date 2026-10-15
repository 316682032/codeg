// Whether the open conversation tabs (and the focused one) follow the
// workspace-wide set every client of the backend shares — `opened_tabs`, kept
// converged over `tabs://changed` — or belong to each window alone.
//
// A backend setting (`tab_sync.enabled`, see `commands/tab_sync.rs`), not a
// per-client one: it decides how the clients of one server relate, so it has to
// hold for all of them at once. Kept per browser, a phone left on the old value
// just silently stayed out of step with the desktop that was switched. Default
// on, like the official build. Only the open-tab UI state is affected;
// conversations, messages, run status and real deletions reach every window
// either way.
//
// Cached at module scope, live across windows and devices: every save is
// broadcast on `tab-sync-settings://changed`, and a reconnect re-reads (the
// broadcaster drops events while a client is away). Same shape as
// `use-feedback-enabled.ts`, except that a failed read leaves the value
// unknown (`null`) instead of guessing — `tab-store` falls back to the shared
// set, which is what an unknown backend gets.

import { useEffect, useSyncExternalStore } from "react"
import { getTabSyncSettings, setTabSyncSettings } from "@/lib/api"
import { onTransportReconnect, subscribe } from "@/lib/platform"
import {
  TAB_SYNC_SETTINGS_CHANGED_EVENT,
  type TabSyncSettings,
} from "@/lib/types"
import { registerBackendScopedStoreReset } from "@/stores/backend-scoped-store-reset"

let cached: boolean | null = null
let inflight: Promise<boolean | null> | null = null
/** Bumped by every save and broadcast: a read that started before one of them
 *  is older than the value it would overwrite. */
let writeGeneration = 0
let readsStarted = 0
let newestReadCommitted = 0
let unwire: (() => void) | null = null
const listeners = new Set<() => void>()

function setCached(value: boolean) {
  if (cached === value) return
  cached = value
  for (const listener of listeners) listener()
}

/** Authoritative update (a save's answer or a broadcast). */
function applyEnabled(value: boolean) {
  writeGeneration += 1
  setCached(value)
}

/** One read of the stored value. Commits only if nothing authoritative landed
 *  meanwhile and no later read committed first; `null` when it failed. */
async function readStored(): Promise<boolean | null> {
  const read = ++readsStarted
  const startGeneration = writeGeneration
  let value: boolean
  try {
    value = (await getTabSyncSettings()).enabled
  } catch {
    return cached
  }
  if (writeGeneration === startGeneration && read > newestReadCommitted) {
    newestReadCommitted = read
    setCached(value)
  }
  return cached
}

/** Subscribe to the broadcast and re-read on reconnect, once per window. */
function ensureWired() {
  if (unwire) return
  let disposed = false
  let offEvent: (() => void) | undefined
  let offReconnect: (() => void) | null = null
  unwire = () => {
    disposed = true
    offEvent?.()
    offReconnect?.()
  }
  // Async so a transport that cannot subscribe yet fails here as a rejection,
  // which clears the guard for a later mount to retry.
  void (async () => {
    const off = await subscribe<TabSyncSettings>(
      TAB_SYNC_SETTINGS_CHANGED_EVENT,
      (settings) => applyEnabled(settings.enabled)
    )
    if (disposed) {
      off()
      return
    }
    offEvent = off
    offReconnect = onTransportReconnect(() => void readStored())
    // A save that landed before the subscription went live was not heard.
    void readStored()
  })().catch(() => {
    if (!disposed) unwire = null
  })
}

/** The backend's value: cached, or read once (concurrent callers share the
 *  read). `null` when it can't be read. Never rejects. */
export function loadTabSyncEnabled(): Promise<boolean | null> {
  ensureWired()
  if (cached !== null) return Promise.resolve(cached)
  if (!inflight) {
    inflight = readStored().finally(() => {
      inflight = null
    })
  }
  return inflight
}

/** Save for the whole backend. Rejects when the save fails; on success this
 *  window switches at once and every other client follows the broadcast. */
export async function saveTabSyncEnabled(value: boolean): Promise<void> {
  ensureWired()
  const saved = await setTabSyncSettings({ enabled: value })
  applyEnabled(saved.enabled)
}

function subscribeStore(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => cached
const getServerSnapshot = () => null

/** Live value of the switch; `null` until the backend has answered. */
export function useTabSyncEnabled(): boolean | null {
  const value = useSyncExternalStore(
    subscribeStore,
    getSnapshot,
    getServerSnapshot
  )
  useEffect(() => {
    void loadTabSyncEnabled()
  }, [])
  return value
}

/** Forget the value and the wiring. The cache holds ONE backend's answer, so
 *  it resets with the other backend-scoped stores; tests use it too. */
export function resetTabSyncPrefs() {
  unwire?.()
  unwire = null
  cached = null
  inflight = null
  writeGeneration = 0
  readsStarted = 0
  newestReadCommitted = 0
  for (const listener of listeners) listener()
}

registerBackendScopedStoreReset(resetTabSyncPrefs)
