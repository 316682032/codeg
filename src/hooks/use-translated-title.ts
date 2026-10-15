"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
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
  getTranslation,
  requestTranslations,
  subscribeTranslationStore,
} from "@/lib/translation/translation-store"
import { useAppWorkspaceStore } from "@/stores/app-workspace-store"

/**
 * A conversation's title as the user reads it: in the reply language when
 * replies are translated automatically.
 *
 * An agent names a session in the language the session is held in, which with
 * message translation on is not the user's: a chat sent in Japanese gets a
 * Japanese title. This is display only, like reply translation — the stored
 * title, and the agent renaming it later, are untouched. A title the user
 * gave the conversation themselves (`title_locked`) is shown as they wrote it.
 *
 * Every title on screen asks in the same tick, so a sidebar full of them is
 * one request; the translations come from the same store and cache as
 * replies.
 *
 * `title` is the formatted title (`formatConversationTitle`); an empty one is
 * returned as is, for the caller's "Untitled".
 */
export function useTranslatedTitle(title: string, locked: boolean): string {
  const settings = useTranslationSettings()
  const locale = useLocale()
  const target = resolveOutputTarget(settings, locale)
  const wanted =
    isTranslationConfigured(settings) &&
    (settings?.output_auto ?? false) &&
    !locked &&
    title.trim() !== "" &&
    !isAlreadyInTarget(title, target)

  const snapshot = useCallback(
    () => (wanted ? getTranslation(title, target) : undefined),
    [wanted, title, target]
  )
  const entry = useSyncExternalStore(
    subscribeTranslationStore,
    snapshot,
    snapshot
  )
  const missing = wanted && entry === undefined

  useEffect(() => {
    if (missing) requestTranslations([title], target)
  }, [missing, title, target])

  return entry?.status === "done" ? entry.text : title
}

/** Whether the user named this conversation themselves, for the views that
 *  hold only its title (a tab, the header). */
export function useConversationTitleLocked(
  conversationId: number | null | undefined
): boolean {
  return useAppWorkspaceStore((state) =>
    conversationId == null
      ? false
      : (state.conversations.find((c) => c.id === conversationId)
          ?.title_locked ?? false)
  )
}
