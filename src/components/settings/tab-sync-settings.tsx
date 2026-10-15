"use client"

/**
 * Whether the open conversation tabs follow every client of the server or stay
 * with each window — the settings-page half of `tab-sync-prefs.ts`. A backend
 * setting: saving it switches every window and device connected to this
 * server, through the broadcast the save fires.
 */

import { useState } from "react"
import { useTranslations } from "next-intl"
import { PanelsTopLeft } from "lucide-react"
import { toast } from "sonner"

import { SettingsSection } from "@/components/shared/settings-section"
import { Switch } from "@/components/ui/switch"
import { toErrorMessage } from "@/lib/app-error"
import { saveTabSyncEnabled, useTabSyncEnabled } from "@/lib/tab-sync-prefs"

export function TabSyncSettingsSection() {
  const t = useTranslations("TabSyncSettings")
  const enabled = useTabSyncEnabled()
  const [saving, setSaving] = useState(false)

  const save = async (next: boolean) => {
    setSaving(true)
    try {
      await saveTabSyncEnabled(next)
    } catch (err) {
      toast.error(t("saveFailed", { message: toErrorMessage(err) }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection
      icon={PanelsTopLeft}
      title={t("title")}
      description={t("description")}
      htmlFor="tab-sync-enabled"
      control={
        <Switch
          id="tab-sync-enabled"
          checked={enabled === true}
          // Inert until the backend has answered: a switch drawn from a guess
          // would save the guess.
          disabled={enabled == null || saving}
          onCheckedChange={(next) => void save(next)}
        />
      }
    >
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </SettingsSection>
  )
}
