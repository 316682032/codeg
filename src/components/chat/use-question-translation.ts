"use client"

/**
 * Translation for an agent's question card: the card shown in the reader's
 * language (`useCardTranslation`), and the free-text "Other" answer translated
 * into the language the agent is written to.
 */

import { useCallback } from "react"

import {
  isTranslationConfigured,
  useTranslationSettings,
} from "@/hooks/use-translation-settings"
import { translateTexts } from "@/lib/api"
import { maskForTranslation } from "@/lib/translation/blocks"
import { isAlreadyInTarget } from "@/lib/translation/languages"
import {
  useCardTranslation,
  type CardTranslation,
} from "@/hooks/use-card-translation"

const LETTER = /\p{L}/u

export type QuestionTranslation = CardTranslation

/** The question card's texts — questions, tab headers, option labels and
 *  descriptions — in the reader's language. See `useCardTranslation`. */
export function useQuestionTranslation(
  texts: string[],
  { request = true }: { request?: boolean } = {}
): QuestionTranslation {
  return useCardTranslation(texts, { kind: "question", request })
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
