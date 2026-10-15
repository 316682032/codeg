import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  TranslationSettingsInput,
  TranslationSettingsView,
} from "@/lib/api"
import enMessages from "@/i18n/messages/en.json"

const saved: TranslationSettingsInput[] = []
let stored: TranslationSettingsView

vi.mock("@/lib/api", () => ({
  getTranslationSettings: vi.fn(async () => stored),
  saveTranslationSettings: vi.fn(async (input: TranslationSettingsInput) => {
    saved.push(input)
    const { dashscope_api_key, tokenhub_api_key, ...settings } = input
    stored = {
      ...settings,
      has_dashscope_key:
        dashscope_api_key === undefined
          ? stored.has_dashscope_key
          : dashscope_api_key !== "",
      has_tokenhub_key:
        tokenhub_api_key === undefined
          ? stored.has_tokenhub_key
          : tokenhub_api_key !== "",
    }
    return stored
  }),
  testTranslationProvider: vi.fn(async () => ({
    model: "qwen-mt-flash",
    elapsed_ms: 412,
    sample: "Sample.",
    translation: "示例。",
  })),
  clearTranslationCache: vi.fn(async () => 3),
}))
vi.mock("@/hooks/use-translation-settings", () => ({
  primeTranslationSettings: vi.fn(),
}))
vi.mock("@/lib/platform", () => ({ openUrl: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { TranslationSettings } from "./translation-settings"

const t = enMessages.TranslationSettings

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <TranslationSettings />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  saved.length = 0
  stored = {
    provider: "dashscope",
    dashscope_model: "qwen-mt-flash",
    dashscope_base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    tokenhub_model: "hy-mt2-plus",
    tokenhub_base_url: "https://tokenhub.tencentmaas.com/v1",
    fallback_enabled: true,
    output_auto: false,
    output_target: null,
    input_target: "en",
    input_translate_on_send: false,
    glossary: [],
    has_dashscope_key: false,
    has_tokenhub_key: false,
  }
})

describe("TranslationSettings", () => {
  it("saves a key without sending the view's flags back, then shows it saved", async () => {
    renderPage()
    // The primary engine has no key, so it opens on its key field.
    const input = await screen.findByLabelText(
      t.key.label.replace("{provider}", t.providers.dashscope)
    )
    await userEvent.type(input, "  sk-abc  ")
    await userEvent.click(screen.getByRole("button", { name: t.key.save }))

    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0].dashscope_api_key).toBe("sk-abc")
    expect(saved[0]).not.toHaveProperty("has_dashscope_key")
    expect(saved[0].tokenhub_api_key).toBeUndefined()
    expect(await screen.findByText(t.key.saved)).toBeInTheDocument()
    expect(screen.getAllByText(t.engine.configured)).toHaveLength(1)
    expect(input).not.toBeInTheDocument()
  })

  it("only lets an engine with a key become the primary", async () => {
    renderPage()
    const tokenhub = await screen.findByRole("radio", {
      name: t.engine.setPrimary.replace("{provider}", t.providers.tokenhub),
    })
    expect(tokenhub).toBeDisabled()
  })

  it("makes another engine the primary once it has a key", async () => {
    stored = { ...stored, has_dashscope_key: true, has_tokenhub_key: true }
    renderPage()
    await userEvent.click(
      await screen.findByRole("radio", {
        name: t.engine.setPrimary.replace("{provider}", t.providers.tokenhub),
      })
    )
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0].provider).toBe("tokenhub")
  })

  it("spells out where a rate-limited primary goes", async () => {
    stored = { ...stored, has_dashscope_key: true, has_tokenhub_key: true }
    renderPage()
    expect(
      await screen.findByText(
        t.engine.fallbackPath.replace(
          "{path}",
          `qwen-mt-lite → ${t.providers.tokenhub} hy-mt2-plus`
        )
      )
    ).toBeInTheDocument()
  })

  it("saves the reply switch on the section heading without touching the keys", async () => {
    renderPage()
    await userEvent.click(
      await screen.findByRole("switch", { name: t.output.title })
    )
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0].output_auto).toBe(true)
    expect(saved[0].dashscope_api_key).toBeUndefined()
  })

  it("saves a glossary row when it is left, not between its fields", async () => {
    renderPage()
    await userEvent.click(
      await screen.findByRole("button", { name: t.glossary.add })
    )
    await userEvent.type(screen.getByLabelText(t.glossary.term), "Codeg")
    await userEvent.tab()
    expect(saved).toHaveLength(0)
    // Past the row's delete button and out of the row.
    await userEvent.tab()
    await userEvent.tab()
    await waitFor(() => expect(saved).toHaveLength(1))
    // An empty translation keeps the term as written.
    expect(saved[0].glossary).toEqual([{ source: "Codeg", target: "Codeg" }])
  })

  it("reads bulk-edited lines, a bare term kept as written", async () => {
    renderPage()
    await userEvent.click(
      await screen.findByRole("button", { name: t.glossary.bulkEdit })
    )
    const box = screen.getByLabelText(t.glossary.title)
    await userEvent.type(
      box,
      "worktree = 工作树{enter}Codeg{enter} = orphan{enter}Codeg = dup"
    )
    await userEvent.tab()
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0].glossary).toEqual([
      { source: "worktree", target: "工作树" },
      { source: "Codeg", target: "Codeg" },
    ])
  })
})
