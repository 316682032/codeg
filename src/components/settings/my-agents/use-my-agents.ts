"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  clearAddAgentsDialogRequest,
  hasAddAgentsDialogRequest,
  orderWithAdded,
} from "@/lib/my-agents"
import type { AcpAgentInfo, AgentType } from "@/lib/types"

/** The part of the settings page's per-agent draft the enable flag rides on. */
interface EnableDraft {
  enabled: boolean
  envText: string
  modelProviderId: number | null
}

interface UseMyAgentsOptions<D extends EnableDraft> {
  /** Every agent, in display order. */
  agents: AcpAgentInfo[]
  drafts: Partial<Record<AgentType, D>>
  draftFor: (agent: AcpAgentInfo) => D
  setDrafts: Dispatch<SetStateAction<Partial<Record<AgentType, D>>>>
  setAgents: Dispatch<SetStateAction<AcpAgentInfo[]>>
  /** The page's own save of `enabled` + env: the one the enable switch uses. */
  persistEnv: (
    agentType: AgentType,
    enabled: boolean,
    envText: string,
    modelProviderId?: number | null
  ) => Promise<unknown>
  persistReorder: (order: AgentType[]) => Promise<void>
  runPreflight: (agentType: AgentType) => Promise<void>
  /** Kept current with the listed set, for the page's on-open preflight. */
  listedRef: MutableRefObject<ReadonlySet<AgentType> | null>
  selectedAgentType: AgentType | null
  select: (agentType: AgentType) => void
}

/**
 * "My agents" for the agents settings page (keh4l build). The list shows the
 * listed agents only — `enabled`, read from the draft so a flip shows at once
 * — and everything else waits in the "Add agents" catalog.
 *
 * Joining and leaving go through the page's own `persistEnv`, exactly like its
 * enable switch, so the agent's env is saved with the flag the way it always
 * was.
 */
export function useMyAgents<D extends EnableDraft>({
  agents,
  drafts,
  draftFor,
  setDrafts,
  setAgents,
  persistEnv,
  persistReorder,
  runPreflight,
  listedRef,
  selectedAgentType,
  select,
}: UseMyAgentsOptions<D>) {
  const t = useTranslations("MyAgents")
  // The picker's "Add agents…" opens this page in its own window and leaves
  // a request behind for it; the page starts with the catalog open.
  const [addOpen, setAddOpen] = useState(hasAddAgentsDialogRequest)
  useEffect(() => clearAddAgentsDialogRequest(), [])
  // A fresh key per opening, so the catalog never reopens on old picks.
  const [addDialogKey, setAddDialogKey] = useState(0)

  const listedAgents = useMemo(
    () =>
      agents.filter(
        (agent) => drafts[agent.agent_type]?.enabled ?? agent.enabled
      ),
    [agents, drafts]
  )
  const listedTypes = useMemo(
    () => new Set(listedAgents.map((agent) => agent.agent_type)),
    [listedAgents]
  )

  // `listedRef` is read by the page's on-open preflight, which must check the
  // listed agents only but must not rerun every time the list changes. A
  // layout effect, so it is current before any passive effect of the same
  // commit reads it.
  const listedTypesRef = useRef<ReadonlySet<AgentType>>(listedTypes)
  const latest = useRef({ agents, drafts, draftFor })
  useLayoutEffect(() => {
    listedTypesRef.current = listedTypes
    listedRef.current = listedTypes
    latest.current = { agents, drafts, draftFor }
  })

  const openAddDialog = useCallback(() => {
    setAddDialogKey((key) => key + 1)
    setAddOpen(true)
  }, [])

  // An agent shown here without being listed (opened by `?agent=`) was not
  // checked when the page opened; check it once it is on screen.
  const checkedOnViewRef = useRef<Set<AgentType>>(new Set())
  useEffect(() => {
    if (!selectedAgentType || listedTypesRef.current.has(selectedAgentType)) {
      return
    }
    if (checkedOnViewRef.current.has(selectedAgentType)) return
    checkedOnViewRef.current.add(selectedAgentType)
    runPreflight(selectedAgentType).catch(() => {})
  }, [selectedAgentType, runPreflight])

  const setListed = useCallback(
    async (agentTypes: readonly AgentType[], enabled: boolean) => {
      for (const agentType of agentTypes) {
        const { agents: all, drafts: current, draftFor: build } = latest.current
        const agent = all.find((entry) => entry.agent_type === agentType)
        if (!agent) continue
        const draft = current[agentType] ?? build(agent)
        if (draft.enabled === enabled) continue
        const next = { ...draft, enabled }
        setDrafts((prev) => ({ ...prev, [agentType]: next }))
        await persistEnv(agentType, enabled, next.envText, next.modelProviderId)
      }
    },
    [persistEnv, setDrafts]
  )

  const reportFailure = useCallback(
    (err: unknown) => {
      toast.error(t("saveFailed"), {
        description: err instanceof Error ? err.message : String(err),
      })
    },
    [t]
  )

  const add = useCallback(
    async (agentTypes: AgentType[]) => {
      if (agentTypes.length === 0) return
      const ordered = orderWithAdded(
        latest.current.agents,
        listedTypesRef.current,
        agentTypes
      )
      const orderOf = new Map(
        ordered.map((agent) => [agent.agent_type, agent.sort_order])
      )
      setAgents((prev) =>
        prev.map((agent) => {
          const sortOrder = orderOf.get(agent.agent_type)
          return sortOrder == null || sortOrder === agent.sort_order
            ? agent
            : { ...agent, sort_order: sortOrder }
        })
      )
      try {
        await setListed(agentTypes, true)
      } catch (err) {
        reportFailure(err)
        throw err
      }
      await persistReorder(ordered.map((agent) => agent.agent_type))
      select(agentTypes[0])
      for (const agentType of agentTypes) {
        checkedOnViewRef.current.add(agentType)
        runPreflight(agentType).catch(() => {})
      }
      toast.success(t("added", { count: agentTypes.length }), {
        action: {
          label: t("undo"),
          onClick: () => {
            setListed(agentTypes, false).catch(reportFailure)
          },
        },
      })
    },
    [
      persistReorder,
      reportFailure,
      runPreflight,
      select,
      setAgents,
      setListed,
      t,
    ]
  )

  /** Called after the page's enable switch saved, to offer the way back. */
  const onToggled = useCallback(
    (agent: AcpAgentInfo, enabled: boolean) => {
      if (enabled) return
      toast.success(t("removed", { name: agent.name }), {
        action: {
          label: t("undo"),
          onClick: () => {
            setListed([agent.agent_type], true).catch(reportFailure)
          },
        },
      })
    },
    [reportFailure, setListed, t]
  )

  const keepInstalled = useCallback(
    async (missing: AcpAgentInfo[]) => {
      const agentTypes = missing.map((agent) => agent.agent_type)
      try {
        await setListed(agentTypes, false)
      } catch (err) {
        reportFailure(err)
        return false
      }
      toast.success(t("hint.kept", { count: agentTypes.length }), {
        action: {
          label: t("undo"),
          onClick: () => {
            setListed(agentTypes, true).catch(reportFailure)
          },
        },
      })
      return true
    },
    [reportFailure, setListed, t]
  )

  return {
    listedAgents,
    listedTypes,
    addOpen,
    setAddOpen,
    addDialogKey,
    openAddDialog,
    add,
    onToggled,
    keepInstalled,
  }
}
