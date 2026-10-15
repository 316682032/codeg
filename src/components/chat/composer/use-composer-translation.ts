"use client"

import { useCallback, useRef, useState } from "react"
import type { Editor } from "@tiptap/core"
import type { Node as PMNode } from "@tiptap/pm/model"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  isTranslationConfigured,
  useTranslationSettings,
} from "@/hooks/use-translation-settings"
import { translateTexts } from "@/lib/api"
import { describeTranslationError } from "@/lib/translation/errors"

import { serializeDocToDisplayText } from "./to-prompt-blocks"
import {
  applyComposerTranslation,
  originalOfDraft,
  recordOriginals,
  snapshotForTranslation,
  type ComposerOriginals,
} from "./translate-composer"

export interface ComposerTranslation {
  /** An engine with a key is configured. */
  available: boolean
  /** Translate on send (the setting), when available. */
  onSend: boolean
  translating: boolean
  /**
   * Replace the composer's text with its translation. Resolves `true` when the
   * composer now holds what should be sent — translated, or nothing needed
   * translating — and `false` when it was left as it was (a toast says why).
   *
   * Only ever on an explicit ask (the button, the shortcut, the menu, a send
   * with translate-on-send): a draft is not sent to the engine while it is
   * being written, which would spend requests — and the per-minute quota reply
   * translation shares — on text nobody asked to translate.
   */
  translateNow: () => Promise<boolean>
  /**
   * For a send: the draft `doc` in the words the user wrote before
   * translating it, or `null` when none of it came from a translation. Forgets
   * what it knew either way — the next draft starts afresh.
   */
  takeOriginal: (doc: PMNode) => string | null
}

export function useComposerTranslation(
  getEditor: () => Editor | null
): ComposerTranslation {
  const t = useTranslations("Translation")
  const settings = useTranslationSettings()
  const available = isTranslationConfigured(settings)
  const target = settings?.input_target ?? "en"
  const [translating, setTranslating] = useState(false)
  const translatingRef = useRef(false)
  const originalsRef = useRef<ComposerOriginals | null>(null)

  const translateNow = useCallback(async (): Promise<boolean> => {
    const editor = getEditor()
    if (!editor || !available) return true
    if (translatingRef.current) return false
    const snapshot = snapshotForTranslation(editor.state.doc, target)
    if (snapshot.segments.length === 0) return true

    translatingRef.current = true
    setTranslating(true)
    try {
      const result = await translateTexts(
        snapshot.segments.map((s) => s.text),
        snapshot.target
      )
      const outcome = applyComposerTranslation(
        editor,
        snapshot,
        result.translations
      )
      if (outcome === "stale") {
        toast.info(t("inputChanged"))
        return false
      }
      if (outcome === "damaged") {
        toast.error(t("inputDamaged"))
        return false
      }
      originalsRef.current = recordOriginals(
        snapshot.doc,
        editor.state.doc,
        originalsRef.current
      )
      return true
    } catch (error) {
      toast.error(
        t("inputFailed", { message: describeTranslationError(error, t) })
      )
      return false
    } finally {
      translatingRef.current = false
      setTranslating(false)
    }
  }, [available, getEditor, t, target])

  const takeOriginal = useCallback((doc: PMNode): string | null => {
    const originals = originalsRef.current
    originalsRef.current = null
    if (!originals) return null
    const original = originalOfDraft(doc, originals)
    return original ? serializeDocToDisplayText(original).trim() : null
  }, [])

  return {
    available,
    onSend: available && (settings?.input_translate_on_send ?? false),
    translating,
    translateNow,
    takeOriginal,
  }
}
