import type { Editor } from "@tiptap/core"
import { closeHistory } from "@tiptap/pm/history"
import { Fragment, type Node as PMNode } from "@tiptap/pm/model"

import { maskForTranslation } from "@/lib/translation/blocks"
import { isAlreadyInTarget } from "@/lib/translation/languages"

/**
 * Translating the composer in place.
 *
 * Each paragraph is translated as one piece, so the engine sees whole
 * sentences, with every inline badge (@mention, slash command, skill, file
 * chip — all `reference` nodes) standing in as a `⟦Rn⟧` placeholder. The
 * translation is rebuilt around the ORIGINAL node instances, so a badge comes
 * back with every attribute it had (an embedded file's uri included), and the
 * whole replacement is one undo step: Cmd+Z returns the text as written.
 */

const REFERENCE = "reference"
const HARD_BREAK = "hardBreak"

export interface ComposerSegment {
  /** Position of the paragraph node. */
  pos: number
  /** Inline nodes the placeholders stand for, by placeholder number. */
  references: Map<number, PMNode>
  /** What goes to the engine. */
  text: string
  restore: (translated: string) => string
}

export interface ComposerSnapshot {
  doc: PMNode
  target: string
  /** Paragraphs that need translating; the others are left alone. */
  segments: ComposerSegment[]
}

/** A `/cmd`, `$skill` or absolute path typed as text: kept verbatim, like the
 *  placeholders `maskForTranslation` adds. */
const BARE_INVOCATION = /(^|\s)([/$][A-Za-z][\w:./-]*)/g

export function snapshotForTranslation(
  doc: PMNode,
  target: string
): ComposerSnapshot {
  const segments: ComposerSegment[] = []
  let referenceCount = 0
  doc.forEach((paragraph, offset) => {
    if (!paragraph.isTextblock) return
    const references = new Map<number, PMNode>()
    let source = ""
    paragraph.forEach((child) => {
      if (child.isText) {
        source += child.text ?? ""
      } else if (child.type.name === HARD_BREAK) {
        source += "\n"
      } else if (child.type.name === REFERENCE) {
        references.set(referenceCount, child)
        source += `⟦R${referenceCount}⟧`
        referenceCount += 1
      }
    })
    const prose = source.replace(/⟦R\d+⟧/g, " ")
    if (!/\p{L}/u.test(prose) || isAlreadyInTarget(prose, target)) return

    // A `/cmd` or `$skill` typed but never turned into a badge is still an
    // invocation; it must reach the agent exactly as typed.
    const invocations: string[] = []
    const withoutInvocations = source.replace(
      BARE_INVOCATION,
      (_match, before: string, token: string) => {
        invocations.push(token)
        return `${before}⟦S${invocations.length - 1}⟧`
      }
    )
    const masked = maskForTranslation(withoutInvocations)
    segments.push({
      pos: offset,
      references,
      text: masked.text,
      restore: (translated) =>
        masked
          .restore(translated)
          .replace(
            /⟦S(\d+)⟧/g,
            (match, index) => invocations[Number(index)] ?? match
          ),
    })
  })
  return { doc, target, segments }
}

export type ApplyOutcome = "applied" | "stale" | "damaged"

/**
 * Replace each translated paragraph's content in one transaction. Refuses when
 * the document changed since the snapshot (the user kept typing) and when any
 * translation lost or duplicated a placeholder; nothing is changed then.
 */
export function applyComposerTranslation(
  editor: Editor,
  snapshot: ComposerSnapshot,
  translations: (string | null)[]
): ApplyOutcome {
  if (!editor.state.doc.eq(snapshot.doc)) return "stale"
  const schema = editor.state.schema
  const rebuilt: { pos: number; size: number; content: Fragment }[] = []

  for (const [i, segment] of snapshot.segments.entries()) {
    const translated = translations[i]
    if (translated == null) return "damaged"
    const restored = segment.restore(translated)
    const used = new Set<number>()
    const nodes: PMNode[] = []
    for (const piece of restored.split(/(⟦R\d+⟧|\n)/)) {
      if (!piece) continue
      const ref = /^⟦R(\d+)⟧$/.exec(piece)
      if (ref) {
        const index = Number(ref[1])
        const node = segment.references.get(index)
        if (!node || used.has(index)) return "damaged"
        used.add(index)
        nodes.push(node)
      } else if (piece === "\n") {
        nodes.push(schema.nodes[HARD_BREAK].create())
      } else {
        nodes.push(schema.text(piece))
      }
    }
    if (used.size !== segment.references.size) return "damaged"
    const paragraph = snapshot.doc.nodeAt(segment.pos)
    if (!paragraph) return "stale"
    rebuilt.push({
      pos: segment.pos,
      size: paragraph.content.size,
      content: Fragment.fromArray(nodes),
    })
  }
  if (rebuilt.length === 0) return "applied"

  // Back to front, so earlier positions stay valid. `closeHistory` on both
  // sides makes this exactly one undo step: it neither merges into the typing
  // just before it nor absorbs the typing just after.
  const tr = closeHistory(editor.state.tr)
  for (const { pos, size, content } of [...rebuilt].reverse()) {
    tr.replaceWith(pos + 1, pos + 1 + size, content)
  }
  editor.view.dispatch(tr)
  editor.view.dispatch(closeHistory(editor.state.tr))
  return "applied"
}

/**
 * Behind each paragraph a translation produced, the paragraph as the user
 * wrote it — keyed by the translated paragraph's text, so it is found again in
 * the draft that gets sent. Kept per draft, across every translation of it.
 */
export type ComposerOriginals = Map<string, PMNode>

/** `previous` plus what one translation (`before` → `after`) replaced. A
 *  paragraph translated again goes back to its first wording, not to the
 *  translation it replaced. */
export function recordOriginals(
  before: PMNode,
  after: PMNode,
  previous: ComposerOriginals | null
): ComposerOriginals {
  const originals = new Map(previous ?? [])
  // A translation rewrites paragraphs in place, never adds or drops one.
  before.forEach((paragraph, _offset, index) => {
    const now = after.maybeChild(index)
    if (!now || !paragraph.isTextblock || paragraph.eq(now)) return
    originals.set(
      now.textContent,
      originals.get(paragraph.textContent) ?? paragraph
    )
  })
  return originals
}

/** How alike a touched-up translation must still be to the translation it
 *  started as for its original to stand behind it. */
const TOUCH_UP_SIMILARITY = 0.7

/** Dice coefficient over character pairs: 1 for the same text, still high
 *  after a word or two is fixed, low for a different sentence. */
function similarity(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0
  const pairs = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i++) {
    const pair = a.slice(i, i + 2)
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1)
  }
  let shared = 0
  for (let i = 0; i < b.length - 1; i++) {
    const pair = b.slice(i, i + 2)
    const left = pairs.get(pair) ?? 0
    if (left > 0) {
      shared += 1
      pairs.set(pair, left - 1)
    }
  }
  return (2 * shared) / (a.length - 1 + (b.length - 1))
}

function originalOf(
  text: string,
  originals: ComposerOriginals
): PMNode | undefined {
  if (!text.trim()) return undefined
  const exact = originals.get(text)
  if (exact) return exact
  let best: PMNode | undefined
  let bestScore = TOUCH_UP_SIMILARITY
  for (const [translated, original] of originals) {
    const score = similarity(text, translated)
    if (score >= bestScore) {
      best = original
      bestScore = score
    }
  }
  return best
}

/**
 * `doc` in its writer's own words: each paragraph that came from a
 * translation — as it came, or touched up since — swapped back for the
 * paragraph it was translated from. `null` when nothing in `doc` did, e.g. a
 * different draft was loaded after translating.
 */
export function originalOfDraft(
  doc: PMNode,
  originals: ComposerOriginals
): PMNode | null {
  let swapped = false
  const paragraphs: PMNode[] = []
  doc.forEach((paragraph) => {
    const original = paragraph.isTextblock
      ? originalOf(paragraph.textContent, originals)
      : undefined
    if (original) swapped = true
    paragraphs.push(original ?? paragraph)
  })
  return swapped ? doc.copy(Fragment.fromArray(paragraphs)) : null
}
