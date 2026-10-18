import { act, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TranslateResult, TranslationSettingsView } from "@/lib/api"

let settings: TranslationSettingsView | null = null
vi.mock("@/hooks/use-translation-settings", () => ({
  useTranslationSettings: () => settings,
  isTranslationConfigured: (s: TranslationSettingsView | null) =>
    Boolean(s?.has_dashscope_key),
}))

type Options = { groups?: number[] }
const translateTexts = vi.fn<
  (
    texts: string[],
    target: string,
    options?: Options
  ) => Promise<TranslateResult>
>(async (texts) => ({
  translations: texts.map((t) => `译:${t}`),
  model: "qwen-mt-flash",
}))
vi.mock("@/lib/api", () => ({
  translateTexts: (texts: string[], target: string, options?: Options) =>
    translateTexts(texts, target, options),
}))

import { resetTranslationStoreForTests } from "@/lib/translation/translation-store"

import { useTranslatedTitle } from "./use-translated-title"

function view(overrides: Partial<TranslationSettingsView> = {}) {
  return {
    provider: "dashscope",
    dashscope_model: "qwen-mt-flash",
    dashscope_base_url: "",
    tokenhub_model: "hy-mt2-plus",
    tokenhub_base_url: "",
    fallback_enabled: true,
    output_auto: true,
    output_target: null,
    question_auto: true,
    plan_auto: true,
    input_target: "ja",
    input_translate_on_send: true,
    glossary: [],
    has_dashscope_key: true,
    has_tokenhub_key: false,
    ...overrides,
  } satisfies TranslationSettingsView
}

function Title({ title, locked = false }: { title: string; locked?: boolean }) {
  return <li>{useTranslatedTitle(title, locked)}</li>
}

function renderTitles(titles: { title: string; locked?: boolean }[]) {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={{}}>
      <ul>
        {titles.map((t) => (
          <Title key={t.title} {...t} />
        ))}
      </ul>
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  resetTranslationStoreForTests()
  translateTexts.mockClear()
  settings = view()
})
afterEach(() => resetTranslationStoreForTests())

describe("useTranslatedTitle", () => {
  it("shows titles in the reply language, all asked for in one request", async () => {
    renderTitles([
      { title: "500マイルのメール事件" },
      { title: "Fix the login redirect" },
      // Already Chinese, the UI language here: left alone.
      { title: "500 英里邮件的故事" },
    ])
    await waitFor(() =>
      expect(
        screen.getAllByRole("listitem").map((li) => li.textContent)
      ).toEqual([
        "译:500マイルのメール事件",
        "译:Fix the login redirect",
        "500 英里邮件的故事",
      ])
    )
    expect(translateTexts.mock.calls).toEqual([
      [
        ["500マイルのメール事件", "Fix the login redirect"],
        "zh-CN",
        { groups: [0, 1] },
      ],
    ])
  })

  it("keeps a title the user gave the conversation", async () => {
    renderTitles([{ title: "API refactor", locked: true }])
    await act(async () => {})
    expect(screen.getByRole("listitem").textContent).toBe("API refactor")
    expect(translateTexts).not.toHaveBeenCalled()
  })

  it("leaves titles alone unless replies are auto-translated", async () => {
    settings = view({ output_auto: false })
    renderTitles([{ title: "500マイルのメール事件" }])
    await act(async () => {})
    expect(screen.getByRole("listitem").textContent).toBe(
      "500マイルのメール事件"
    )
    expect(translateTexts).not.toHaveBeenCalled()
  })
})
