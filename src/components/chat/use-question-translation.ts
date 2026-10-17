"use client"

/**
 * Translation for an agent's question card: the card shown in the reader's
 * language, and the free-text "Other" answer translated into the language the
 * agent is written to.
 *
 * Reads the settings itself rather than `TranslationContext`: the live card is
 * pinned above the composer, outside the message list that provides it.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import { useLocale } from "next-intl"

import {
  isTranslationConfigured,
  useTranslationSettings,
} from "@/hooks/use-translation-settings"
import { translateTexts } from "@/lib/api"
import { maskForTranslation } from "@/lib/translation/blocks"
import {
  isAlreadyInTarget,
  resolveOutputTarget,
} from "@/lib/translation/languages"
import {
  forgetFailedTranslations,
  getBlockOverride,
  getTranslation,
  getTranslationStoreVersion,
  requestTranslations,
  setBlockOverrides,
  subscribeTranslationStore,
} from "@/lib/translation/translation-store"

export interface QuestionTranslation {
  /** The card can be translated: an engine is set up and some of it is not
   *  in the reader's language already. */
  offered: boolean
  /** The card shows its translation (or is about to). */
  translated: boolean
  /** Some of it is still being translated. */
  pending: boolean
  toggle: () => void
  /** `text` as the card shows it: its translation once that is wanted and
   *  ready, `text` itself otherwise. */
  shown: (text: string) => string
}

const LETTER = /\p{L}/u

/**
 * The card's texts — questions, tab headers, option labels and descriptions —
 * shown in the reader's language: on their own with the "question cards"
 * setting on, or once the card's button asks. All of a card goes to the engine
 * as one group, so an option is translated in the light of its question.
 *
 * `request` false only reads what is already translated (a folded record's
 * summary), so a session full of answered questions costs nothing until one is
 * opened.
 */
export function useQuestionTranslation(
  texts: string[],
  { request = true }: { request?: boolean } = {}
): QuestionTranslation {
  const settings = useTranslationSettings()
  const locale = useLocale()
  const configured = isTranslationConfigured(settings)
  const auto = settings?.question_auto ?? false
  const target = resolveOutputTarget(settings, locale)
  const version = useSyncExternalStore(
    subscribeTranslationStore,
    getTranslationStoreVersion,
    getTranslationStoreVersion
  )
  const textsKey = texts.join("\u0000")

  const bodies = useMemo(() => {
    if (!configured) return []
    const out = new Set<string>()
    for (const text of texts) {
      const body = text.trim()
      if (LETTER.test(body) && !isAlreadyInTarget(body, target)) out.add(body)
    }
    return [...out]
    // `textsKey` stands for `texts`' content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, textsKey, target])

  const wanted = useMemo(
    () =>
      bodies.filter(
        (body) =>
          (getBlockOverride(body) ?? (auto ? "translated" : "original")) ===
          "translated"
      ),
    // `version` carries the button's overrides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bodies, auto, version]
  )
  const missing = useMemo(
    () => wanted.filter((body) => !getTranslation(body, target)),
    // `version` carries entries being dropped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wanted, target, version]
  )
  const missingKey = missing.join("\u0000")

  useEffect(() => {
    if (request && missing.length > 0) requestTranslations(missing, target)
    // `missingKey` stands for `missing`'s content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, missingKey, target])

  const shown = useCallback(
    (text: string): string => {
      const body = text.trim()
      if (!wanted.includes(body)) return text
      const entry = getTranslation(body, target)
      return entry?.status === "done" ? entry.text : text
    },
    // `version` carries translations landing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wanted, target, version]
  )

  const translated = wanted.length > 0
  const toggle = useCallback(() => {
    if (translated) {
      setBlockOverrides(bodies, "original")
    } else {
      // An explicit ask retries what failed earlier.
      forgetFailedTranslations(bodies)
      setBlockOverrides(bodies, "translated")
    }
  }, [bodies, translated])

  return {
    offered: bodies.length > 0,
    translated,
    pending: wanted.some(
      (body) => getTranslation(body, target)?.status === "pending"
    ),
    toggle,
    shown,
  }
}

export interface AnswerTranslator {
  /** An engine is set up. */
  available: boolean
  /** Translate typed answers on submit: the composer's "translate when
   *  sending", since an answer is a message to the agent too. */
  onSend: boolean
  /**
   * Each of `texts` in the language messages to the agent are written in, in
   * one request — a text already in it comes back as it is — or `null` for one
   * whose translation lost the code or links it had to keep. Rejects when the
   * engine fails.
   */
  translate: (texts: string[]) => Promise<(string | null)[]>
}

export function useAnswerTranslator(): AnswerTranslator {
  const settings = useTranslationSettings()
  const available = isTranslationConfigured(settings)
  const target = settings?.input_target ?? "en"

  const translate = useCallback(
    async (texts: string[]): Promise<(string | null)[]> => {
      const asked = texts.flatMap((text, index) =>
        LETTER.test(text) && !isAlreadyInTarget(text, target)
          ? [{ index, masked: maskForTranslation(text) }]
          : []
      )
      const out: (string | null)[] = [...texts]
      if (asked.length === 0) return out
      const result = await translateTexts(
        asked.map((a) => a.masked.text),
        target
      )
      asked.forEach(({ index, masked }, i) => {
        const translated = result.translations[i]
        out[index] = translated == null ? null : masked.restore(translated)
      })
      return out
    },
    [target]
  )

  return {
    available,
    onSend: available && (settings?.input_translate_on_send ?? false),
    translate,
  }
}
