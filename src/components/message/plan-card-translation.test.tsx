import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import enMessages from "@/i18n/messages/en.json"
import type { TranslateResult, TranslationSettingsView } from "@/lib/api"
import type { PlanEntryInfo } from "@/lib/types"

/**
 * A todo list in the reader's language, the way a question card is: on its own
 * with the "todo lists" setting on, or with the card's button, which switches
 * back too.
 */

let settings: TranslationSettingsView
vi.mock("@/hooks/use-translation-settings", () => ({
  useTranslationSettings: () => settings,
  isTranslationConfigured: (s: TranslationSettingsView | null) =>
    Boolean(s?.has_dashscope_key),
}))

const DICTIONARY: Record<string, string> = {
  "Create the shared profile": "创建共享配置",
  "Refactor the transports": "重构传输层",
}
const translateTexts = vi.fn<
  (texts: string[], target: string) => Promise<TranslateResult>
>(async (texts) => ({
  translations: texts.map((t) => DICTIONARY[t] ?? `译:${t}`),
  model: "qwen-mt-flash",
}))
vi.mock("@/lib/api", () => ({
  translateTexts: (texts: string[], target: string) =>
    translateTexts(texts, target),
}))

import { resetTranslationStoreForTests } from "@/lib/translation/translation-store"

import { AgentPlanOverlay } from "@/components/chat/agent-plan-overlay"

import { PlanCard } from "./plan-card"

const plan = enMessages.Folder.chat.agentPlanOverlay

const ENTRIES: PlanEntryInfo[] = [
  {
    content: "Create the shared profile",
    priority: "medium",
    status: "in_progress",
  },
  { content: "Refactor the transports", priority: "medium", status: "pending" },
  // Already in the reader's language: left alone.
  { content: "补测试", priority: "low", status: "pending" },
]

function view(
  overrides: Partial<TranslationSettingsView> = {}
): TranslationSettingsView {
  return {
    provider: "dashscope",
    dashscope_model: "qwen-mt-flash",
    dashscope_base_url: "",
    tokenhub_model: "hy-mt2-plus",
    tokenhub_base_url: "",
    fallback_enabled: true,
    output_auto: true,
    output_target: "zh-CN",
    question_auto: true,
    plan_auto: true,
    input_target: "en",
    input_translate_on_send: false,
    glossary: [],
    has_dashscope_key: true,
    has_tokenhub_key: false,
    ...overrides,
  }
}

function renderCard() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <PlanCard entries={ENTRIES} />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  settings = view()
  translateTexts.mockClear()
  resetTranslationStoreForTests()
})
afterEach(() => {
  cleanup()
  resetTranslationStoreForTests()
})

describe("a translated todo list", () => {
  it("shows its steps translated, the whole list in one request", async () => {
    renderCard()
    expect(await screen.findByText("创建共享配置")).toBeInTheDocument()
    expect(screen.getByText("重构传输层")).toBeInTheDocument()
    expect(screen.getByText("补测试")).toBeInTheDocument()
    expect(translateTexts.mock.calls).toEqual([
      [["Create the shared profile", "Refactor the transports"], "zh-CN"],
    ])
  })

  it("switches back to the steps as written with its button", async () => {
    renderCard()
    await screen.findByText("创建共享配置")
    await userEvent.click(
      screen.getByRole("button", { name: plan.showOriginal })
    )
    expect(screen.getByText("Create the shared profile")).toBeInTheDocument()
  })

  it("waits for the button with todo lists not translated on their own", async () => {
    settings = view({ plan_auto: false })
    renderCard()
    await act(async () => {})
    expect(screen.getByText("Create the shared profile")).toBeInTheDocument()
    expect(translateTexts).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole("button", { name: plan.translatePlan })
    )
    expect(await screen.findByText("创建共享配置")).toBeInTheDocument()
  })

  it("follows its own setting, not the question cards'", async () => {
    settings = view({ plan_auto: false, question_auto: true })
    renderCard()
    await act(async () => {})
    expect(translateTexts).not.toHaveBeenCalled()
  })

  it("offers nothing without an engine", async () => {
    settings = view({ has_dashscope_key: false })
    renderCard()
    await act(async () => {})
    expect(
      screen.queryByRole("button", { name: plan.translatePlan })
    ).toBeNull()
    expect(translateTexts).not.toHaveBeenCalled()
  })

  it("reads the same in the floating plan, with its own button", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AgentPlanOverlay entries={ENTRIES} defaultExpanded />
      </NextIntlClientProvider>
    )
    expect(await screen.findByText("创建共享配置")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: plan.showOriginal })
    )
    expect(screen.getByText("Create the shared profile")).toBeInTheDocument()
  })
})
