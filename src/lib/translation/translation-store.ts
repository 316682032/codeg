import { translateTexts } from "@/lib/api"

import { maskForTranslation } from "./blocks"

/**
 * Translations of reply blocks, shared by every view in the window.
 *
 * Keyed by the block's text and the target language, never by a message or
 * component id: a reply is re-keyed and remounted several times on its way from
 * the live stream into history, and a translation must survive all of it.
 *
 * A reply is translated once it has finished, all of it together: each
 * `requestTranslations` call is one group (the paragraphs of one text), and the
 * backend sends a group to the engine in a single call so every paragraph is
 * translated in the context of the others. Everything asked for in the same
 * tick — the text parts of a reply that just finished, the replies of a
 * session just opened — goes out as one request, so a finished reply costs one
 * of the 60 requests a minute Bailian allows each model; asked for while that
 * language has a request in flight, it waits and goes out with the next.
 */

export type TranslationEntry =
  | { status: "pending" }
  | { status: "done"; text: string }
  | { status: "failed" }

export type BlockMode = "original" | "translated"

/** Whole groups per request up to this much: the backend runs up to three
 *  engine calls of 6,000 characters at once. A longer group goes alone. */
const MAX_REQUEST_CHARS = 18_000

const entries = new Map<string, TranslationEntry>()
const overrides = new Map<string, BlockMode>()
/** Per language: groups waiting to go out, oldest first. */
const queues = new Map<string, string[][]>()
const inFlight = new Set<string>()
const scheduled = new Set<string>()
const listeners = new Set<() => void>()
let version = 0
let errorHandler: ((error: unknown) => void) | null = null

function keyOf(body: string, target: string): string {
  return `${target}\u0000${body}`
}

function notify(): void {
  version += 1
  for (const listener of listeners) listener()
}

export function subscribeTranslationStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Snapshot for `useSyncExternalStore`: changes whenever anything does. */
export function getTranslationStoreVersion(): number {
  return version
}

export function getTranslation(
  body: string,
  target: string
): TranslationEntry | undefined {
  return entries.get(keyOf(body, target))
}

/** A per-block choice that beats the auto-translate setting (the per-reply
 *  button). */
export function getBlockOverride(body: string): BlockMode | undefined {
  return overrides.get(body)
}

export function setBlockOverrides(bodies: string[], mode: BlockMode): void {
  for (const body of bodies) overrides.set(body, mode)
  notify()
}

/** Where a failed request is reported; one handler per window is enough. */
export function setTranslationErrorHandler(
  handler: ((error: unknown) => void) | null
): void {
  errorHandler = handler
}

/** Ask for `bodies` — the paragraphs of one text — as one group. Those
 *  already translated, failed or on their way are left out. */
export function requestTranslations(bodies: string[], target: string): void {
  const group: string[] = []
  for (const body of bodies) {
    const key = keyOf(body, target)
    if (entries.has(key)) continue
    entries.set(key, { status: "pending" })
    group.push(body)
  }
  if (group.length === 0) return
  const queue = queues.get(target) ?? []
  queue.push(group)
  queues.set(target, queue)
  notify()
  if (scheduled.has(target)) return
  scheduled.add(target)
  // After the effects of this render: they all land in one request.
  queueMicrotask(() => {
    scheduled.delete(target)
    flush(target)
  })
}

function flush(target: string): void {
  if (inFlight.has(target)) return
  const queue = queues.get(target)
  if (!queue || queue.length === 0) return

  const groups: string[][] = []
  let size = 0
  while (queue.length > 0) {
    const next = queue[0]
    const nextSize = next.reduce((total, body) => total + body.length, 0)
    if (groups.length > 0 && size + nextSize > MAX_REQUEST_CHARS) break
    groups.push(next)
    size += nextSize
    queue.shift()
  }
  const batch = groups.flat()

  inFlight.add(target)
  const masked = batch.map(maskForTranslation)
  translateTexts(
    masked.map((m) => m.text),
    target,
    { groups: groups.flatMap((group, i) => group.map(() => i)) }
  )
    .then((result) => {
      batch.forEach((body, i) => {
        const translated = result.translations[i]
        entries.set(
          keyOf(body, target),
          translated == null
            ? { status: "failed" }
            : { status: "done", text: masked[i].restore(translated) }
        )
      })
    })
    .catch((error: unknown) => {
      for (const body of batch) {
        entries.set(keyOf(body, target), { status: "failed" })
      }
      errorHandler?.(error)
    })
    .finally(() => {
      inFlight.delete(target)
      notify()
      flush(target)
    })
}

/** Forget failures so the blocks are asked for again — after a key was added,
 *  or when the user asks for a reply's translation explicitly. */
export function forgetFailedTranslations(bodies?: string[]): void {
  let changed = false
  for (const [key, entry] of entries) {
    if (entry.status !== "failed") continue
    if (bodies && !bodies.some((body) => key.endsWith(`\u0000${body}`)))
      continue
    entries.delete(key)
    changed = true
  }
  if (changed) notify()
}

/** Forget every finished translation, e.g. after the glossary or engine
 *  changed. Requests in flight still land. */
export function forgetAllTranslations(): void {
  for (const [key, entry] of entries) {
    if (entry.status !== "pending") entries.delete(key)
  }
  notify()
}

/** Test hook: back to an empty store. */
export function resetTranslationStoreForTests(): void {
  entries.clear()
  overrides.clear()
  queues.clear()
  inFlight.clear()
  scheduled.clear()
  errorHandler = null
  notify()
}
