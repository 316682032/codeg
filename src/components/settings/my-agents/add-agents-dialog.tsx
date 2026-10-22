"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Check, Loader2, Package, Search } from "lucide-react"

import { AgentIcon } from "@/components/agent-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  catalogGroups,
  isAgentInstalled,
  type CatalogFilter,
} from "@/lib/my-agents"
import type { AcpAgentInfo, AgentType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AddAgentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Every agent, in display order. */
  agents: AcpAgentInfo[]
  /** The agents already in "My agents"; the catalog offers the rest. */
  listedTypes: ReadonlySet<AgentType>
  onAdd: (agentTypes: AgentType[]) => Promise<void>
  onAddCustom: () => void
}

const FILTERS: CatalogFilter[] = ["all", "installed", "missing"]

/**
 * The "Add agents" catalog (keh4l build): every agent not in "My agents",
 * searchable, filterable by whether it is installed here, picked several at a
 * time. Keyed by the caller on each opening, so a reopened dialog starts clean.
 */
export function AddAgentsDialog({
  open,
  onOpenChange,
  agents,
  listedTypes,
  onAdd,
  onAddCustom,
}: AddAgentsDialogProps) {
  const t = useTranslations("MyAgents")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<CatalogFilter>("all")
  const [picked, setPicked] = useState<AgentType[]>([])
  const [adding, setAdding] = useState(false)

  const groups = useMemo(
    () => catalogGroups(agents, listedTypes, query, filter),
    [agents, listedTypes, query, filter]
  )
  const anyOffered = agents.some((agent) => !listedTypes.has(agent.agent_type))
  const shown =
    groups.installed.length + groups.missing.length + groups.custom.length

  const toggle = (agentType: AgentType, on: boolean) => {
    setPicked((prev) =>
      on
        ? prev.includes(agentType)
          ? prev
          : [...prev, agentType]
        : prev.filter((type) => type !== agentType)
    )
  }

  const confirm = async () => {
    if (picked.length === 0 || adding) return
    setAdding(true)
    try {
      // In display order, not click order, so they join the list the way the
      // catalog showed them.
      const order = agents.map((agent) => agent.agent_type)
      await onAdd(
        [...picked].sort((a, b) => order.indexOf(a) - order.indexOf(b))
      )
      onOpenChange(false)
    } finally {
      setAdding(false)
    }
  }

  const statusText = (agent: AcpAgentInfo): string => {
    if (!agent.available) return t("dialog.unavailable")
    if (isAgentInstalled(agent)) {
      return t("dialog.installedVersion", {
        version: agent.installed_version ?? "",
      })
    }
    return agent.distribution_type === "system"
      ? t("dialog.systemInstall")
      : t("dialog.notInstalled")
  }

  const renderGroup = (
    key: string,
    title: string,
    icon: ReactNode,
    list: AcpAgentInfo[]
  ) =>
    list.length === 0 ? null : (
      <div key={key} role="group" aria-label={title}>
        <div className="flex items-center gap-1.5 px-2 pt-3 pb-1 text-xs text-muted-foreground">
          {icon}
          {title}
        </div>
        {list.map((agent) => {
          const checked = picked.includes(agent.agent_type)
          const installed = isAgentInstalled(agent)
          return (
            <label
              key={agent.agent_type}
              data-agent-type={agent.agent_type}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-transparent px-2 py-2",
                agent.available
                  ? "cursor-pointer hover:bg-muted/50"
                  : "cursor-not-allowed opacity-50",
                checked && "border-border bg-muted/60"
              )}
            >
              <Checkbox
                checked={checked}
                disabled={!agent.available || adding}
                onCheckedChange={(next) =>
                  toggle(agent.agent_type, next === true)
                }
                aria-label={agent.name}
              />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                <AgentIcon agentType={agent.agent_type} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{agent.name}</span>
                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 px-1.5 text-2xs"
                  >
                    {agent.distribution_type}
                  </Badge>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {agent.description}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs",
                  installed && agent.available
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                )}
              >
                {statusText(agent)}
              </span>
            </label>
          )
        })}
      </div>
    )

  return (
    <Dialog open={open} onOpenChange={(next) => !adding && onOpenChange(next)}>
      <DialogContent className="flex max-h-[min(44rem,calc(100vh-2rem))] max-w-2xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("dialog.search")}
              aria-label={t("dialog.search")}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div role="radiogroup" className="inline-flex gap-1">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "h-7 cursor-pointer rounded-full border px-3 text-xs transition-colors",
                  filter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                {t(`dialog.filter.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="-mx-2 min-h-40 flex-1 overflow-y-auto px-2">
          {shown === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {anyOffered ? t("dialog.noMatch") : t("dialog.allAdded")}
            </div>
          ) : (
            <>
              {renderGroup(
                "installed",
                t("dialog.groupInstalled", { count: groups.installed.length }),
                <Check className="h-3.5 w-3.5" />,
                groups.installed
              )}
              {renderGroup(
                "missing",
                t("dialog.groupMissing", { count: groups.missing.length }),
                <Package className="h-3.5 w-3.5" />,
                groups.missing
              )}
              {renderGroup(
                "custom",
                t("dialog.groupCustom", { count: groups.custom.length }),
                <Package className="h-3.5 w-3.5" />,
                groups.custom
              )}
            </>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs"
            disabled={adding}
            onClick={() => {
              onOpenChange(false)
              onAddCustom()
            }}
          >
            {t("dialog.addCustom")}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={adding}
              onClick={() => onOpenChange(false)}
            >
              {t("dialog.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={picked.length === 0 || adding}
              onClick={() => void confirm()}
            >
              {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {picked.length > 0
                ? t("dialog.confirmCount", { count: picked.length })
                : t("dialog.confirm")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
