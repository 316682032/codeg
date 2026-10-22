/**
 * "My agents" (keh4l build): the picker shows only the user's agents, so it
 * offers the way to the rest — the "Add agents" catalog in settings.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/hooks/use-acp-agents", () => ({
  useAcpAgents: vi.fn(),
}))

import { AgentSelector } from "./agent-selector"
import { useAcpAgents } from "@/hooks/use-acp-agents"
import enMessages from "@/i18n/messages/en.json"
import { hasAddAgentsDialogRequest } from "@/lib/my-agents"
import type { AcpAgentInfo, AgentType } from "@/lib/types"

const mockUseAcpAgents = vi.mocked(useAcpAgents)

function agent(agentType: AgentType): AcpAgentInfo {
  return {
    agent_type: agentType,
    skills_capable: true,
    registry_id: agentType,
    registry_version: null,
    supports_custom_version: false,
    name: agentType,
    description: "",
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
    codex_config_toml: null,
    codex_model_catalog: null,
    codex_sandbox_settings: null,
    grok_config_toml: null,
    grok_settings: null,
    cline_secrets_json: null,
    hermes_config_yaml: null,
    cursor_cli_config_json: null,
    cursor_settings: null,
    model_provider_id: null,
    icon_url: null,
  }
}

function renderSelector(agents: AcpAgentInfo[], onOpen = vi.fn()) {
  mockUseAcpAgents.mockReturnValue({
    agents,
    fresh: true,
    refresh: async () => {},
  })
  render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AgentSelector onSelect={() => {}} onOpenAgentsSettings={onOpen} />
    </NextIntlClientProvider>
  )
  return onOpen
}

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => {
  window.localStorage.clear()
  mockUseAcpAgents.mockReset()
  vi.restoreAllMocks()
})

describe("AgentSelector — My agents", () => {
  it("sends an empty picker to the catalog", () => {
    const onOpen = renderSelector([])
    fireEvent.click(
      screen.getByRole("button", { name: "Open Agents settings" })
    )
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(hasAddAgentsDialogRequest()).toBe(true)
  })

  it("ends the row with Add agents when nothing overflows", () => {
    const onOpen = renderSelector([agent("claude_code"), agent("codex")])
    expect(screen.queryByLabelText(/More agents/)).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Add agents…" }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(hasAddAgentsDialogRequest()).toBe(true)
  })

  it("ends the overflow menu with Add agents…", async () => {
    // Room for three icon pills: the rest overflow into the menu.
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
      function (this: HTMLElement) {
        const slot = this.dataset.slot
        return slot === "agent-selector"
          ? 160
          : slot === "agent-pill"
            ? 38
            : slot === "agent-selector-more"
              ? 32
              : 0
      }
    )
    const onOpen = renderSelector(
      (["claude_code", "codex", "gemini", "cline", "pi", "grok"] as const).map(
        agent
      )
    )
    fireEvent.click(screen.getByLabelText(/More agents/))
    const add = await waitFor(() => {
      const el = document.querySelector('[data-slot="agent-selector-add"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    expect(add).toHaveTextContent("Add agents…")
    fireEvent.click(add)
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(hasAddAgentsDialogRequest()).toBe(true)
  })
})
