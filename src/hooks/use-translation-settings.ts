"use client"

/**
 * The translation settings for the conversation views and the composer.
 * Cached at module scope so every mounted view shares one fetch.
 *
 * Cross-window reactive, like `use-feedback-enabled`: the settings UI runs in a
 * separate window, so the backend broadcasts `translation-settings://changed`
 * on every save and this module applies it; WS reconnects re-fetch, since the
 * broadcaster drops events sent while no client listens. A save or broadcast
 * is authoritative over a read that started before it.
 *
 * A change to anything that shapes a translation (engine, model, glossary)
 * drops the finished translations held in this window, and any change drops
 * the failed ones, so adding a key retries what failed for want of one.
 */

import { useEffect, useState } from "react"

import { getTranslationSettings } from "@/lib/api"
import type { TranslationSettingsView } from "@/lib/api"
import { onTransportReconnect, subscribe } from "@/lib/platform"
import {
  forgetAllTranslations,
  forgetFailedTranslations,
} from "@/lib/translation/translation-store"
import { TRANSLATION_SETTINGS_CHANGED_EVENT } from "@/lib/types"

let cached: TranslationSettingsView | null = null
let inflight: Promise<void> | null = null
let saveGeneration = 0
let readsStarted = 0
let newestReadCommitted = 0
let crossWindowWired = false
const listeners = new Set<(settings: TranslationSettingsView) => void>()

function engineFingerprint(s: TranslationSettingsView | null): string {
  if (!s) return ""
  return JSON.stringify([
    s.provider,
    s.dashscope_model,
    s.tokenhub_model,
    s.dashscope_base_url,
    s.tokenhub_base_url,
    s.glossary,
  ])
}

function commit(next: TranslationSettingsView): void {
  const previous = cached
  cached = next
  if (previous && engineFingerprint(previous) !== engineFingerprint(next)) {
    forgetAllTranslations()
  } else if (previous) {
    forgetFailedTranslations()
  }
  for (const listener of listeners) listener(next)
}

function applyAuthoritative(next: TranslationSettingsView): void {
  saveGeneration += 1
  commit(next)
}

/** The saving window's instant update; others converge via the broadcast. */
export function primeTranslationSettings(next: TranslationSettingsView): void {
  ensureCrossWindowSync()
  applyAuthoritative(next)
}

function beginRead(): (value: TranslationSettingsView) => void {
  const read = ++readsStarted
  const startGeneration = saveGeneration
  return (value) => {
    if (saveGeneration !== startGeneration || read < newestReadCommitted) return
    newestReadCommitted = read
    commit(value)
  }
}

function ensureLoaded(): Promise<void> {
  if (inflight) return inflight
  const apply = beginRead()
  // Unreadable settings leave the feature off; nothing to report here. Not
  // even a failure to start the read may escape: the sidebar's titles read
  // these settings, and the sidebar must not fail with translation.
  let read: Promise<TranslationSettingsView>
  try {
    read = getTranslationSettings()
  } catch {
    return Promise.resolve()
  }
  inflight = read
    .then(apply)
    .catch(() => {})
    .finally(() => {
      inflight = null
    })
  return inflight
}

function ensureCrossWindowSync(): void {
  if (crossWindowWired) return
  crossWindowWired = true
  try {
    void subscribe<TranslationSettingsView>(
      TRANSLATION_SETTINGS_CHANGED_EVENT,
      applyAuthoritative
    ).catch(() => {
      crossWindowWired = false
    })
    onTransportReconnect(() => {
      const apply = beginRead()
      void getTranslationSettings()
        .then(apply)
        .catch(() => {})
    })
  } catch {
    // No transport to listen on: translation stays off. The views that read
    // these settings (the sidebar's titles among them) must not fail with it.
    crossWindowWired = false
  }
}

export function useTranslationSettings(): TranslationSettingsView | null {
  const [settings, setSettings] = useState<TranslationSettingsView | null>(
    () => cached
  )

  useEffect(() => {
    ensureCrossWindowSync()
    listeners.add(setSettings)
    if (cached === null) void ensureLoaded()
    return () => {
      listeners.delete(setSettings)
    }
  }, [])

  return settings
}

/** Whether the selected engine has a key, i.e. translating can work at all. */
export function isTranslationConfigured(
  settings: TranslationSettingsView | null
): boolean {
  if (!settings) return false
  return settings.provider === "dashscope"
    ? settings.has_dashscope_key
    : settings.has_tokenhub_key
}
