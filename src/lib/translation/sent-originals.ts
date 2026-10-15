import { getSentOriginals, saveSentOriginal } from "@/lib/api"

/**
 * What the user wrote before the composer translated it, by the message as
 * sent — so a sent message can be shown in its sender's own words again.
 *
 * Looked up by the message's text, the one thing that carries over when the
 * transcript reloads it from the agent's own records. Everything asked for in
 * the same tick (the bubbles of a session just opened) goes out as one
 * request, like the reply translations.
 */

type Entry = { status: "pending" } | { status: "done"; original: string | null }

const entries = new Map<string, Entry>()
/** Messages currently shown in their original words. */
const showingOriginal = new Set<string>()
const waiting: string[] = []
let scheduled = false
const listeners = new Set<() => void>()
let version = 0

/** The same normalization the backend keys by: line endings and the
 *  surrounding whitespace are all a reload changes. */
function keyOf(text: string): string {
  return text.replace(/\r\n/g, "\n").trim()
}

function notify(): void {
  version += 1
  for (const listener of listeners) listener()
}

export function subscribeSentOriginals(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Snapshot for `useSyncExternalStore`: changes whenever anything does. */
export function getSentOriginalsVersion(): number {
  return version
}

/** The original of `sent`: a string, `null` when it was sent as written, or
 *  `undefined` while that is not known yet. */
export function getSentOriginal(sent: string): string | null | undefined {
  const entry = entries.get(keyOf(sent))
  return entry?.status === "done" ? entry.original : undefined
}

export function requestSentOriginal(sent: string): void {
  const key = keyOf(sent)
  if (!key || entries.has(key)) return
  entries.set(key, { status: "pending" })
  waiting.push(key)
  if (scheduled) return
  scheduled = true
  queueMicrotask(flush)
}

function flush(): void {
  scheduled = false
  const keys = waiting.splice(0)
  if (keys.length === 0) return
  getSentOriginals(keys)
    .then((originals) => {
      keys.forEach((key, i) => {
        entries.set(key, { status: "done", original: originals[i] ?? null })
      })
    })
    .catch(() => {
      // Asked again by the next bubble that mounts; until then, as sent.
      for (const key of keys) entries.delete(key)
    })
    .finally(notify)
}

/**
 * Remember `original` for a message sent as `sent` (each form it may come back
 * in). Known in this window at once, so the bubble the send just added can
 * switch already; saved for every later window and reload.
 */
export function rememberSentOriginal(sent: string[], original: string): void {
  const keys = [...new Set(sent.map(keyOf))].filter(
    (key) => key && key !== original.trim()
  )
  if (keys.length === 0 || !original.trim()) return
  for (const key of keys) {
    entries.set(key, { status: "done", original: original.trim() })
  }
  notify()
  void saveSentOriginal(keys, original).catch(() => {
    // Lost on the next reload only; the message itself went out.
  })
}

export function isShowingSentOriginal(sent: string): boolean {
  return showingOriginal.has(keyOf(sent))
}

export function setShowingSentOriginal(sent: string, on: boolean): void {
  const key = keyOf(sent)
  if (on) showingOriginal.add(key)
  else showingOriginal.delete(key)
  notify()
}

/** Test hook: back to an empty store. */
export function resetSentOriginalsForTests(): void {
  entries.clear()
  showingOriginal.clear()
  waiting.length = 0
  scheduled = false
  notify()
}
