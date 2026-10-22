import { beforeEach, describe, expect, it } from "vitest"

import {
  catalogGroups,
  clearAddAgentsDialogRequest,
  hasAddAgentsDialogRequest,
  listedButMissing,
  mergeListedOrder,
  orderWithAdded,
  requestAddAgentsDialog,
} from "@/lib/my-agents"
import type { AcpAgentInfo, AgentType } from "@/lib/types"

function agent(
  agentType: AgentType,
  overrides: Partial<AcpAgentInfo> = {}
): AcpAgentInfo {
  return {
    agent_type: agentType,
    name: agentType,
    description: `${agentType} agent`,
    available: true,
    installed_version: "1.0.0",
    enabled: true,
    sort_order: 0,
    ...overrides,
  } as AcpAgentInfo
}

const types = (list: AcpAgentInfo[]) => list.map((a) => a.agent_type)
const orders = (list: AcpAgentInfo[]) => list.map((a) => a.sort_order)

describe("mergeListedOrder", () => {
  it("puts the reordered listed agents first and keeps the rest after them", () => {
    const all = [
      agent("claude_code", { sort_order: 0 }),
      agent("gemini", { sort_order: 1, enabled: false }),
      agent("codex", { sort_order: 2 }),
      agent("cline", { sort_order: 3, enabled: false }),
    ]
    const merged = mergeListedOrder(all, [all[2], all[0]])
    expect(types(merged)).toEqual(["codex", "claude_code", "gemini", "cline"])
    expect(orders(merged)).toEqual([0, 1, 2, 3])
  })
})

describe("orderWithAdded", () => {
  it("adds after the listed agents, ignoring ones already listed", () => {
    const all = [
      agent("claude_code", { sort_order: 0 }),
      agent("gemini", { sort_order: 1 }),
      agent("codex", { sort_order: 2 }),
      agent("cline", { sort_order: 3 }),
    ]
    const listed = new Set<AgentType>(["claude_code", "codex"])
    const ordered = orderWithAdded(all, listed, ["cline", "codex"])
    expect(types(ordered)).toEqual(["claude_code", "codex", "cline", "gemini"])
    expect(orders(ordered)).toEqual([0, 1, 2, 3])
  })
})

describe("catalogGroups", () => {
  const all = [
    agent("claude_code"),
    agent("gemini", { installed_version: null }),
    agent("qoder"),
    agent("custom:goose", { name: "Goose", installed_version: null }),
  ]
  const listed = new Set<AgentType>(["claude_code"])

  it("offers every unlisted agent, installed built-ins first", () => {
    const groups = catalogGroups(all, listed, "", "all")
    expect(types(groups.installed)).toEqual(["qoder"])
    expect(types(groups.missing)).toEqual(["gemini"])
    expect(types(groups.custom)).toEqual(["custom:goose"])
  })

  it("narrows by text and by install state", () => {
    expect(types(catalogGroups(all, listed, "GOO", "all").custom)).toEqual([
      "custom:goose",
    ])
    const missing = catalogGroups(all, listed, "", "missing")
    expect(types(missing.installed)).toEqual([])
    expect(types(missing.missing)).toEqual(["gemini"])
    const installed = catalogGroups(all, listed, "", "installed")
    expect(types(installed.missing)).toEqual([])
    expect(types(installed.custom)).toEqual([])
  })
})

describe("listedButMissing", () => {
  it("names listed agents that are not installed but could run here", () => {
    const listed = [
      agent("claude_code"),
      agent("gemini", { installed_version: null }),
      agent("cursor", { installed_version: null, available: false }),
    ]
    expect(types(listedButMissing(listed))).toEqual(["gemini"])
  })
})

describe("the picker's request to open the catalog", () => {
  beforeEach(() => window.localStorage.clear())

  it("holds for a while and can be cleared", () => {
    requestAddAgentsDialog(1_000)
    expect(hasAddAgentsDialogRequest(1_000 + 29_000)).toBe(true)
    expect(hasAddAgentsDialogRequest(1_000 + 31_000)).toBe(false)
    clearAddAgentsDialogRequest()
    expect(hasAddAgentsDialogRequest(1_000)).toBe(false)
  })
})
