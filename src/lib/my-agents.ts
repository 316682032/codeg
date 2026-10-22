/**
 * "My agents" (keh4l build): the agents settings page lists only the agents a
 * user has added — the ones whose `enabled` flag is on — and keeps every other
 * one in an "Add agents" catalog. Nothing new is stored: being in "My agents"
 * IS `enabled`, so the picker, delegation and every other surface that reads
 * the flag follow without change.
 */
import {
  isCustomAgentType,
  type AcpAgentInfo,
  type AgentType,
} from "@/lib/types"

/** Whether the agent counts as installed on this machine, as the list reports
 * it (the same signal as the picker's "not installed" dot). */
export function isAgentInstalled(agent: AcpAgentInfo): boolean {
  return agent.installed_version != null
}

/**
 * `all` in display order, with `listed` (the "My agents" rows, in their new
 * order) first and every other agent after them in the order it had, each
 * renumbered from 0. The page shows only the listed rows, so a drag there must
 * not drop the rest from the order it persists.
 */
export function mergeListedOrder(
  all: AcpAgentInfo[],
  listed: AcpAgentInfo[]
): AcpAgentInfo[] {
  const listedTypes = new Set(listed.map((agent) => agent.agent_type))
  const byType = new Map(all.map((agent) => [agent.agent_type, agent]))
  const head = listed.map((agent) => byType.get(agent.agent_type) ?? agent)
  const tail = all.filter((agent) => !listedTypes.has(agent.agent_type))
  return [...head, ...tail].map((agent, index) =>
    agent.sort_order === index ? agent : { ...agent, sort_order: index }
  )
}

/** Where `added` go when they join: right after the agents already listed. */
export function orderWithAdded(
  all: AcpAgentInfo[],
  listedTypes: ReadonlySet<AgentType>,
  added: readonly AgentType[]
): AcpAgentInfo[] {
  const listed = all.filter((agent) => listedTypes.has(agent.agent_type))
  const joining = added
    .map((type) => all.find((agent) => agent.agent_type === type))
    .filter((agent): agent is AcpAgentInfo => agent != null)
    .filter((agent) => !listedTypes.has(agent.agent_type))
  return mergeListedOrder(all, [...listed, ...joining])
}

export type CatalogFilter = "all" | "installed" | "missing"

export interface CatalogGroups {
  installed: AcpAgentInfo[]
  missing: AcpAgentInfo[]
  custom: AcpAgentInfo[]
}

/**
 * The agents the catalog offers — every one not in "My agents" — narrowed by
 * the search text and the installed filter, and grouped: built-ins installed
 * on this machine first (the likeliest picks), then the rest, then custom
 * agents. Within a group the display order is kept.
 */
export function catalogGroups(
  agents: AcpAgentInfo[],
  listedTypes: ReadonlySet<AgentType>,
  query: string,
  filter: CatalogFilter
): CatalogGroups {
  const needle = query.trim().toLowerCase()
  const offered = agents.filter((agent) => {
    if (listedTypes.has(agent.agent_type)) return false
    if (filter === "installed" && !isAgentInstalled(agent)) return false
    if (filter === "missing" && isAgentInstalled(agent)) return false
    if (!needle) return true
    return [agent.name, agent.description, agent.agent_type].some((text) =>
      text.toLowerCase().includes(needle)
    )
  })
  const groups: CatalogGroups = { installed: [], missing: [], custom: [] }
  for (const agent of offered) {
    if (isCustomAgentType(agent.agent_type)) groups.custom.push(agent)
    else if (isAgentInstalled(agent)) groups.installed.push(agent)
    else groups.missing.push(agent)
  }
  return groups
}

/**
 * The listed agents a one-time hint offers to drop: in "My agents" but not
 * installed. A user upgrading from a build that enabled every agent has a
 * dozen of these; nothing can start them until they are installed.
 */
export function listedButMissing(listed: AcpAgentInfo[]): AcpAgentInfo[] {
  return listed.filter((agent) => agent.available && !isAgentInstalled(agent))
}

// --- browser-local flags ------------------------------------------------------

const ADD_DIALOG_REQUEST_KEY = "codeg:my-agents:open-add-dialog"
const HINT_DISMISSED_KEY = "codeg:my-agents:hint-dismissed"
/** How long a request from the picker waits for the settings page to open. */
const ADD_DIALOG_REQUEST_TTL_MS = 30_000

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * Asks the agents settings page, about to be opened, to open the catalog on
 * arrival. It opens in its own window, so the request crosses through the
 * origin's storage rather than the URL the window opener builds.
 */
export function requestAddAgentsDialog(now = Date.now()): void {
  storage()?.setItem(ADD_DIALOG_REQUEST_KEY, String(now))
}

/** Whether a fresh request is waiting. Reads only; see the clear below. */
export function hasAddAgentsDialogRequest(now = Date.now()): boolean {
  const at = Number(storage()?.getItem(ADD_DIALOG_REQUEST_KEY) ?? NaN)
  return (
    Number.isFinite(at) &&
    now - at >= 0 &&
    now - at <= ADD_DIALOG_REQUEST_TTL_MS
  )
}

export function clearAddAgentsDialogRequest(): void {
  storage()?.removeItem(ADD_DIALOG_REQUEST_KEY)
}

export function isMyAgentsHintDismissed(): boolean {
  return storage()?.getItem(HINT_DISMISSED_KEY) === "1"
}

export function dismissMyAgentsHint(): void {
  storage()?.setItem(HINT_DISMISSED_KEY, "1")
}
