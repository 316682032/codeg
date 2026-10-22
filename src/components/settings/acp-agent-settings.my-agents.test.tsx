/**
 * "My agents" (keh4l build): the list shows enabled agents only, the rest are
 * added from a catalog, and leaving goes through the same enable switch (and
 * the same env-preserving save) as before.
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import enMessages from "@/i18n/messages/en.json"
import {
  acpListAgents,
  acpPreflight,
  acpReorderAgents,
  acpUpdateAgentEnv,
  listModelProviders,
} from "@/lib/api"
import { requestAddAgentsDialog } from "@/lib/my-agents"
import type { AcpAgentInfo, AgentType } from "@/lib/types"

import { AcpAgentSettings } from "./acp-agent-settings"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === "function" ? vi.fn(() => new Promise(() => {})) : value,
    ])
  )
})
vi.mock("next/navigation", () => {
  const params = new URLSearchParams()
  return { useSearchParams: () => params }
})
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

function agent(
  agentType: AgentType,
  name: string,
  overrides: Partial<AcpAgentInfo> = {}
): AcpAgentInfo {
  return {
    agent_type: agentType,
    skills_capable: true,
    registry_id: agentType,
    registry_version: null,
    supports_custom_version: false,
    name,
    description: `${name} description`,
    available: true,
    distribution_type: "npx",
    is_acp_adapter: false,
    custom_source: null,
    enabled: true,
    sort_order: 0,
    installed_version: "1.0.0",
    host_tools_agent_mode: false,
    env: {},
    config_json: null,
    config_file_path: null,
    opencode_auth_json: null,
    codex_auth_json: null,
    cline_secrets_json: null,
    codex_config_toml: null,
    codex_model_catalog: null,
    codex_sandbox_settings: null,
    grok_config_toml: null,
    grok_settings: null,
    hermes_config_yaml: null,
    cursor_cli_config_json: null,
    cursor_settings: null,
    model_provider_id: null,
    icon_url: null,
    ...overrides,
  }
}

const AGENTS = [
  agent("claude_code", "Claude Code", { sort_order: 0, env: { KEEP: "1" } }),
  agent("kiro", "Kiro CLI", { sort_order: 1, distribution_type: "system" }),
  agent("gemini", "Gemini CLI", {
    sort_order: 2,
    enabled: false,
    installed_version: null,
  }),
  agent("qoder", "Qoder", { sort_order: 3, enabled: false }),
  agent("pi", "Pi", { sort_order: 4 }),
]

function renderPage(agents = AGENTS) {
  vi.mocked(acpListAgents).mockResolvedValue(agents)
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AcpAgentSettings />
    </NextIntlClientProvider>
  )
}

function listedNames(): string[] {
  const list = document.querySelector("[data-agent-type]")?.parentElement
  if (!list) return []
  return Array.from(list.querySelectorAll("[data-agent-type]")).map(
    (row) => row.getAttribute("data-agent-type") ?? ""
  )
}

describe("AcpAgentSettings — My agents", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(listModelProviders).mockResolvedValue([])
    vi.mocked(acpUpdateAgentEnv).mockResolvedValue(0)
    vi.mocked(acpReorderAgents).mockResolvedValue(undefined)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("lists only the enabled agents and checks only them on open", async () => {
    renderPage()
    await screen.findByRole("button", { name: /Add agents/ })
    expect(listedNames()).toEqual(["claude_code", "kiro", "pi"])
    expect(screen.getByText(/2 more available/)).toBeInTheDocument()
    await waitFor(() => expect(acpPreflight).toHaveBeenCalledTimes(3))
    const checked = vi.mocked(acpPreflight).mock.calls.map(([type]) => type)
    expect(checked.sort()).toEqual(["claude_code", "kiro", "pi"])
  })

  it("adds the picked agents from the catalog after the listed ones", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole("button", { name: /Add agents/ }))
    const dialog = await screen.findByRole("dialog")
    const installed = within(dialog).getByRole("group", {
      name: "Installed on this machine · 1",
    })
    expect(
      within(installed).getByRole("checkbox", { name: "Qoder" })
    ).toBeInTheDocument()
    const missing = within(dialog).getByRole("group", {
      name: "Not installed · 1",
    })
    expect(
      within(missing).getByRole("checkbox", { name: "Gemini CLI" })
    ).toBeInTheDocument()

    // Picked out of display order; they still join in display order.
    await user.click(within(dialog).getByRole("checkbox", { name: "Qoder" }))
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Gemini CLI" })
    )
    await user.click(within(dialog).getByRole("button", { name: "Add 2" }))

    await waitFor(() =>
      expect(acpReorderAgents).toHaveBeenCalledWith([
        "claude_code",
        "kiro",
        "pi",
        "gemini",
        "qoder",
      ])
    )
    const enabledCalls = vi
      .mocked(acpUpdateAgentEnv)
      .mock.calls.map(([type, params]) => [type, params.enabled])
    expect(enabledCalls).toEqual([
      ["gemini", true],
      ["qoder", true],
    ])
    await waitFor(() =>
      expect(listedNames()).toEqual([
        "claude_code",
        "kiro",
        "pi",
        "gemini",
        "qoder",
      ])
    )
    expect(toast.success).toHaveBeenCalledWith(
      "Added 2 agents",
      expect.objectContaining({ action: expect.anything() })
    )
  })

  it("leaves My agents through the enable switch, keeping env and offering undo", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(
      await screen.findByRole("switch", { name: "Claude Code enable switch" })
    )
    await waitFor(() => expect(acpUpdateAgentEnv).toHaveBeenCalledTimes(1))
    const [type, params] = vi.mocked(acpUpdateAgentEnv).mock.calls[0]
    expect(type).toBe("claude_code")
    expect(params).toMatchObject({ enabled: false, env: { KEEP: "1" } })
    await waitFor(() => expect(listedNames()).toEqual(["kiro", "pi"]))
    // Still shown, so it can be switched straight back on.
    expect(
      screen.getByRole("switch", { name: "Claude Code enable switch" })
    ).toHaveAttribute("aria-checked", "false")

    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    const [message, options] = vi.mocked(toast.success).mock.calls[0]
    expect(message).toBe("Removed Claude Code from My agents")
    const action = (options as unknown as { action: { onClick: () => void } })
      .action
    action.onClick()
    await waitFor(() => expect(acpUpdateAgentEnv).toHaveBeenCalledTimes(2))
    expect(vi.mocked(acpUpdateAgentEnv).mock.calls[1][1]).toMatchObject({
      enabled: true,
      env: { KEEP: "1" },
    })
    await waitFor(() =>
      expect(listedNames()).toEqual(["claude_code", "kiro", "pi"])
    )
  })

  it("offers once to drop listed agents that aren't installed", async () => {
    const user = userEvent.setup()
    const agents = [
      ...AGENTS.slice(0, 2),
      agent("cline", "Cline", { sort_order: 5, installed_version: null }),
    ]
    renderPage(agents)
    const hint = await screen.findByRole("status")
    expect(hint).toHaveTextContent("1 agent in My agents isn't installed")
    await user.click(
      within(hint).getByRole("button", { name: "Keep only the 2 installed" })
    )
    await waitFor(() =>
      expect(acpUpdateAgentEnv).toHaveBeenCalledWith(
        "cline",
        expect.objectContaining({ enabled: false })
      )
    )
    await waitFor(() => expect(listedNames()).toEqual(["claude_code", "kiro"]))
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("leaves out of the hint an agent added here to be installed", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole("button", { name: /Add agents/ }))
    const dialog = await screen.findByRole("dialog")
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Gemini CLI" })
    )
    await user.click(within(dialog).getByRole("button", { name: "Add 1" }))
    await waitFor(() => expect(listedNames()).toContain("gemini"))
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("never shows the hint again once kept as is", async () => {
    const user = userEvent.setup()
    const agents = [
      agent("cline", "Cline", { installed_version: null }),
      AGENTS[0],
    ]
    const first = renderPage(agents)
    const hint = await screen.findByRole("status")
    await user.click(within(hint).getByRole("button", { name: "Keep as is" }))
    expect(screen.queryByRole("status")).toBeNull()
    first.unmount()

    renderPage(agents)
    await screen.findByRole("button", { name: /Add agents/ })
    expect(screen.queryByRole("status")).toBeNull()
    expect(acpUpdateAgentEnv).not.toHaveBeenCalled()
  })

  it("opens the catalog on arrival when the picker asked for it", async () => {
    requestAddAgentsDialog()
    renderPage()
    expect(
      await screen.findByRole("dialog", { name: "Add agents" })
    ).toBeInTheDocument()
    // The request is used once.
    expect(
      window.localStorage.getItem("codeg:my-agents:open-add-dialog")
    ).toBeNull()
  })
})
