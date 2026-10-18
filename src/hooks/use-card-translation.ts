"use client"

/**
 * Translation for the cards an agent shows in the conversation — its question
 * cards and its todo lists: shown in the reader's language on their own (each
 * kind has its setting) or with the card's button, which switches back too.
 *
 * Reads the settings itself rather than `TranslationContext`: some of these
 * cards render outside the message list that provides it (the live question
 * card above the composer, the floating plan panel, the session details).
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import { useLocale } from "next-intl"

import {
  isTranslationConfigured,
  useTranslationSettings,
} from "@/hooks/use-translation-settings"
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

export interface CardTranslation {
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

/** Which card, and so which "translate automatically" setting applies. */
export type CardKind = "question" | "plan"

/**
 * A card's texts shown in the reader's language: on their own with that
 * card's setting on, or once the card's button asks. All of a card goes to the
 * engine as one group, so each text is translated in the light of the rest
 * (an option in the light of its question, a step in the light of the plan).
 *
 * `request` false only reads what is already translated (a folded record's
 * summary), so a session full of cards costs nothing until one is opened.
 */
export function useCardTranslation(
  texts: string[],
  { kind, request = true }: { kind: CardKind; request?: boolean }
): CardTranslation {
  const settings = useTranslationSettings()
  const locale = useLocale()
  const configured = isTranslationConfigured(settings)
  const auto =
    (kind === "question" ? settings?.question_auto : settings?.plan_auto) ??
    false
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

/** A todo list's steps in the reader's language. See `useCardTranslation`. */
export function usePlanTranslation(
  steps: readonly { content: string }[]
): CardTranslation {
  return useCardTranslation(
    steps.map((step) => step.content),
    { kind: "plan" }
  )
}
