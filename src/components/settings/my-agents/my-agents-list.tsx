"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  dismissMyAgentsHint,
  isMyAgentsHintDismissed,
  listedButMissing,
} from "@/lib/my-agents"
import type { AcpAgentInfo } from "@/lib/types"

/** The list's title row: "My agents · N" and the way into the catalog. */
export function MyAgentsListHeader({
  count,
  onAdd,
}: {
  count: number
  onAdd: () => void
}) {
  const t = useTranslations("MyAgents")
  return (
    <div className="flex items-center justify-between gap-2 border-b py-1 pl-3 pr-1.5 text-xs text-muted-foreground">
      <span>
        <span className="font-medium text-foreground">{t("title")}</span>
        {" · "}
        {count}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="h-7 text-xs text-muted-foreground"
        onClick={onAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("add")}
      </Button>
    </div>
  )
}

/** The dashed row under the list, naming how many agents the catalog holds. */
export function AddAgentsRow({
  available,
  onAdd,
}: {
  available: number
  onAdd: () => void
}) {
  const t = useTranslations("MyAgents")
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground"
    >
      <Plus className="h-3.5 w-3.5" />
      {t("addAgents")}
      {available > 0 && (
        <span className="text-muted-foreground">
          · {t("moreAvailable", { count: available })}
        </span>
      )}
    </button>
  )
}

export function MyAgentsEmpty() {
  const t = useTranslations("MyAgents")
  return (
    <div className="px-3 py-8 text-center text-xs text-muted-foreground">
      <div className="text-sm text-foreground">{t("empty")}</div>
      <div className="mt-1">{t("emptyHint")}</div>
    </div>
  )
}

/**
 * The one-time hint for a user who came from a build that listed every agent:
 * some listed agents are not installed, and could go. It names only the ones
 * that were missing when the page opened — an agent added here just now, to be
 * installed next, is the user's choice — and once either button is used it is
 * never shown again (on this device).
 */
export function MyAgentsHint({
  listed,
  onKeepInstalled,
}: {
  listed: AcpAgentInfo[]
  onKeepInstalled: (missing: AcpAgentInfo[]) => Promise<boolean>
}) {
  const t = useTranslations("MyAgents")
  const [dismissed, setDismissed] = useState(isMyAgentsHintDismissed)
  const [busy, setBusy] = useState(false)
  const [missingOnOpen] = useState(
    () => new Set(listedButMissing(listed).map((agent) => agent.agent_type))
  )
  const missing = listedButMissing(listed).filter((agent) =>
    missingOnOpen.has(agent.agent_type)
  )
  if (dismissed || missing.length === 0) return null

  const dismiss = () => {
    dismissMyAgentsHint()
    setDismissed(true)
  }

  return (
    <div
      role="status"
      className="mx-2 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
    >
      <div className="font-medium">
        {t("hint.title", { count: missing.length })}
      </div>
      <div className="mt-0.5">{t("hint.body")}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="xs"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            onKeepInstalled(missing)
              .then((kept) => {
                if (kept) dismiss()
              })
              .finally(() => setBusy(false))
          }}
        >
          {t("hint.keepInstalled", { count: listed.length - missing.length })}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={busy}
          onClick={dismiss}
        >
          {t("hint.dismiss")}
        </Button>
      </div>
    </div>
  )
}
