"use client"

/**
 * Reply translation for the message views: which language, whether replies
 * are translated on their own, and the hooks that read it — one for a block of
 * Markdown (a reply's text, a thinking block), one for a whole reply's button,
 * one for switching a sent message back to the words its sender typed.
 *
 * A context (provided at the `MessageListView` root) rather than props, for the
 * same reason as `ModelLabelProvider`: the memoized turn rows deliberately do
 * not take it as a prop. Outside a provider the default leaves text untouched,
 * so every other surface that renders Markdown is unaffected.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  isTranslationConfigured,
  useTranslationSettings,
} from "@/hooks/use-translation-settings"
import { splitBlocks, type MarkdownBlock } from "@/lib/translation/blocks"
import { describeTranslationError } from "@/lib/translation/errors"
import {
  isAlreadyInTarget,
  resolveOutputTarget,
} from "@/lib/translation/languages"
import {
  getSentOriginal,
  getSentOriginalsVersion,
  isShowingSentOriginal,
  requestSentOriginal,
  setShowingSentOriginal,
  subscribeSentOriginals,
} from "@/lib/translation/sent-originals"
import {
  forgetFailedTranslations,
  getBlockOverride,
  getTranslation,
  getTranslationStoreVersion,
  requestTranslations,
  setBlockOverrides,
  setTranslationErrorHandler,
  subscribeTranslationStore,
  type BlockMode,
} from "@/lib/translation/translation-store"

interface TranslationContextValue {
  /** An engine with a key is configured. */
  available: boolean
  /** Replies are translated without being asked. */
  auto: boolean
  target: string
}

const DISABLED: TranslationContextValue = {
  available: false,
  auto: false,
  target: "en",
}

const TranslationContext = createContext<TranslationContextValue>(DISABLED)

/** One toast per this many ms at most: a failing engine fails every block. */
const ERROR_TOAST_INTERVAL_MS = 30_000

export function TranslationProvider({ children }: { children: ReactNode }) {
  const settings = useTranslationSettings()
  const locale = useLocale()
  const t = useTranslations("Translation")

  const value = useMemo<TranslationContextValue>(
    () => ({
      available: isTranslationConfigured(settings),
      auto: settings?.output_auto ?? false,
      target: resolveOutputTarget(settings, locale),
    }),
    [settings, locale]
  )

  useEffect(() => {
    let lastShown = 0
    const handler = (error: unknown) => {
      const now = Date.now()
      if (now - lastShown < ERROR_TOAST_INTERVAL_MS) return
      lastShown = now
      toast.error(
        t("replyFailed", { message: describeTranslationError(error, t) })
      )
    }
    setTranslationErrorHandler(handler)
    return () => setTranslationErrorHandler(null)
  }, [t])

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

function useStoreVersion(): number {
  return useSyncExternalStore(
    subscribeTranslationStore,
    getTranslationStoreVersion,
    getTranslationStoreVersion
  )
}

function modeOf(body: string, auto: boolean): BlockMode {
  return getBlockOverride(body) ?? (auto ? "translated" : "original")
}

/** The blocks of `text` a translation can stand in for: prose not already in
 *  the target language. */
function translatableBodies(blocks: MarkdownBlock[], target: string): string[] {
  return blocks
    .filter(
      (block) =>
        block.kind === "prose" && !isAlreadyInTarget(block.body, target)
    )
    .map((block) => block.body)
}

/** `blocks` with each of `wanted` whose translation has landed swapped for
 *  it; `swapped` lists which blocks were. */
function swapIn(
  blocks: MarkdownBlock[],
  wanted: Set<string>,
  target: string
): { markdown: string; swapped: number[] } {
  const swapped: number[] = []
  const markdown = blocks
    .map((block, i) => {
      if (!wanted.has(block.body)) return block.raw
      const entry = getTranslation(block.body, target)
      if (entry?.status !== "done") return block.raw
      swapped.push(i)
      return block.lead + entry.text + block.trail
    })
    .join("")
  return { markdown, swapped }
}

export interface TranslatedMarkdown {
  markdown: string
  /**
   * Which blocks `markdown` shows translated; changes whenever one flips
   * either way. Key the renderer on it: Streamdown memoizes tables, lists and
   * paragraphs by their source span alone, so a translation that happens to
   * span the same lines and columns (a table whose last row is all code) would
   * otherwise keep showing the original.
   */
  revision: string
}

/**
 * The Markdown to show for an assistant text or thinking block: each prose
 * block whose translation is ready replaced by it, everything else as written.
 *
 * Nothing is translated while the turn is still being written (`settled`
 * false): once it finishes, all of the text's paragraphs are asked for
 * together, as one group, so the engine translates each in the context of the
 * rest instead of paragraph by paragraph as they stream in.
 */
export function useTranslatedMarkdown(
  text: string,
  { translatable, settled }: { translatable: boolean; settled: boolean }
): TranslatedMarkdown {
  const { available, auto, target } = useContext(TranslationContext)
  const active = translatable && available
  const version = useStoreVersion()

  const blocks = useMemo(
    () => (active && settled ? splitBlocks(text) : null),
    [active, settled, text]
  )
  const bodies = useMemo(
    () => (blocks ? translatableBodies(blocks, target) : []),
    [blocks, target]
  )
  const wanted = useMemo(
    () => bodies.filter((body) => modeOf(body, auto) === "translated"),
    // `version` carries override changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bodies, auto, version]
  )
  // Wanted and not in the store: never asked for, or dropped since (the
  // engine changed, a failure is being retried).
  const missing = useMemo(
    () => wanted.filter((body) => !getTranslation(body, target)),
    // `version` carries entries being dropped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wanted, target, version]
  )
  const missingKey = missing.join("\u0000")

  useEffect(() => {
    if (missing.length > 0) requestTranslations(missing, target)
    // `missingKey` stands for `missing`'s content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey, target])

  return useMemo(() => {
    if (!blocks || wanted.length === 0) return { markdown: text, revision: "" }
    const { markdown, swapped } = swapIn(blocks, new Set(wanted), target)
    return { markdown, revision: swapped.join(",") }
    // `version` carries translations landing in the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, wanted, target, text, version])
}

export interface TurnTranslation {
  /** Whether the button is offered at all. */
  visible: boolean
  /** The reply currently shows its translation (or is about to). */
  translated: boolean
  /** Some of its blocks are still being translated. */
  pending: boolean
  toggle: () => void
  /**
   * The reply's text as it reads on screen, for the copy button: `null` while
   * none of it shows a translation, so the caller copies the text as written.
   */
  shownReplyText: () => string | null
}

const NO_TEXTS: string[] = []

/**
 * The per-reply button: show this reply translated, or as written — its text
 * and its thinking alike, so one button answers "this reply, in my language".
 * Thinking is only translated once its panel is opened (`ReasoningBody`); the
 * button decides what an opened panel shows.
 */
export function useTurnTranslation(
  texts: string[],
  thinking: string[] = NO_TEXTS
): TurnTranslation {
  const { available, auto, target } = useContext(TranslationContext)
  const version = useStoreVersion()
  const textsKey = texts.join("\u0000")
  const thinkingKey = thinking.join("\u0000")

  const bodies = useMemo(
    () =>
      available
        ? [...texts, ...thinking].flatMap((text) =>
            translatableBodies(splitBlocks(text), target)
          )
        : [],
    // The keys stand for the arrays' content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [available, textsKey, thinkingKey, target]
  )

  const { translated, pending } = useMemo(() => {
    const shown = bodies.filter((body) => modeOf(body, auto) === "translated")
    return {
      translated: shown.length > 0,
      pending: shown.some(
        (body) => getTranslation(body, target)?.status === "pending"
      ),
    }
    // `version` carries overrides and translations changing in the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, auto, target, version])

  const toggle = useCallback(() => {
    if (translated) {
      setBlockOverrides(bodies, "original")
    } else {
      // An explicit ask retries blocks that failed earlier.
      forgetFailedTranslations(bodies)
      setBlockOverrides(bodies, "translated")
    }
  }, [bodies, translated])

  // Read when the copy button is pressed, not on every render.
  const shownReplyText = useCallback((): string | null => {
    if (!available) return null
    let swappedAny = false
    const shown = texts.map((text) => {
      const blocks = splitBlocks(text)
      const wanted = translatableBodies(blocks, target).filter(
        (body) => modeOf(body, auto) === "translated"
      )
      if (wanted.length === 0) return text
      const { markdown, swapped } = swapIn(blocks, new Set(wanted), target)
      if (swapped.length > 0) swappedAny = true
      return markdown
    })
    return swappedAny ? shown.join("\n") : null
    // `textsKey` stands for `texts`' content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, auto, target, textsKey])

  return {
    visible: bodies.length > 0,
    translated,
    pending,
    toggle,
    shownReplyText,
  }
}

export interface SentOriginal {
  /** What the user wrote before the composer translated it; `null` when the
   *  message went out as written, or that is not known. */
  original: string | null
  /** The bubble shows `original` instead of what was sent. */
  showing: boolean
  toggle: () => void
}

/**
 * A sent message's original words, for the bubble's switch. Only looked up
 * while translation is set up: someone who never translates has no originals,
 * and their sessions should not pay a lookup per message for it.
 */
export function useSentOriginal(sent: string): SentOriginal {
  const { available } = useContext(TranslationContext)
  useSyncExternalStore(
    subscribeSentOriginals,
    getSentOriginalsVersion,
    getSentOriginalsVersion
  )
  useEffect(() => {
    if (available) requestSentOriginal(sent)
  }, [available, sent])

  const original = available ? (getSentOriginal(sent) ?? null) : null
  const showing = original !== null && isShowingSentOriginal(sent)
  const toggle = useCallback(
    () => setShowingSentOriginal(sent, !isShowingSentOriginal(sent)),
    [sent]
  )
  return { original, showing, toggle }
}
