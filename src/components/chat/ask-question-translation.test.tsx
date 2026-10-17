import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import enMessages from "@/i18n/messages/en.json"
import type { TranslateResult, TranslationSettingsView } from "@/lib/api"
import type { PendingQuestionState } from "@/lib/types"

/**
 * A question card in the reader's language, and a typed "Other" answer in the
 * agent's: shown translated on its own or by the card's button, translated by
 * hand or on submit, never for a secret.
 */

let settings: TranslationSettingsView
vi.mock("@/hooks/use-translation-settings", () => ({
  useTranslationSettings: () => settings,
  isTranslationConfigured: (s: TranslationSettingsView | null) =>
    Boolean(s?.has_dashscope_key),
}))

const DICTIONARY: Record<string, string> = {
  "Which sessions?": "哪些会话？",
  Scope: "范围",
  "All sessions": "全部会话",
  "Sorted by size.": "按大小排序。",
  "Old ones only": "只要旧的",
  大的也要: "Large ones too",
}
const translateTexts = vi.fn<
  (texts: string[], target: string) => Promise<TranslateResult>
>(async (texts) => ({
  translations: texts.map((t) => DICTIONARY[t] ?? `译:${t}`),
  model: "qwen-mt-flash",
}))
const saveSentOriginal = vi.fn<
  (sent: string[], original: string) => Promise<void>
>(async () => {})
vi.mock("@/lib/api", () => ({
  translateTexts: (texts: string[], target: string) =>
    translateTexts(texts, target),
  saveSentOriginal: (sent: string[], original: string) =>
    saveSentOriginal(sent, original),
  getSentOriginals: async (texts: string[]) => texts.map(() => null),
}))
const toast = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

import { resetSentOriginalsForTests } from "@/lib/translation/sent-originals"
import { resetTranslationStoreForTests } from "@/lib/translation/translation-store"

import { AskQuestionCard } from "./ask-question-card"

const ask = enMessages.Folder.chat.askQuestion

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
    input_target: "en",
    input_translate_on_send: false,
    glossary: [],
    has_dashscope_key: true,
    has_tokenhub_key: false,
    ...overrides,
  }
}

function question(isSecret = false): PendingQuestionState {
  return {
    question_id: "q-1",
    created_at: "2026-01-01T00:00:00Z",
    questions: [
      {
        id: "qa",
        question: "Which sessions?",
        header: "Scope",
        multi_select: false,
        is_secret: isSecret,
        options: [
          {
            label: "All sessions (Recommended)",
            description: "Sorted by size.",
          },
          { label: "Old ones only", description: "" },
        ],
      },
    ],
  }
}

function renderCard(q = question()) {
  const onAnswer = vi.fn(async () => {})
  render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AskQuestionCard question={q} onAnswer={onAnswer} />
    </NextIntlClientProvider>
  )
  return onAnswer
}

async function typeOther(text: string) {
  await userEvent.click(screen.getByText(ask.other))
  await userEvent.type(screen.getByRole("textbox", { name: ask.other }), text)
}

beforeEach(() => {
  settings = view()
  translateTexts.mockClear()
  saveSentOriginal.mockClear()
  toast.error.mockClear()
  resetTranslationStoreForTests()
  resetSentOriginalsForTests()
})
afterEach(() => {
  cleanup()
  resetTranslationStoreForTests()
  resetSentOriginalsForTests()
})

describe("the card in the reader's language", () => {
  it("shows the question and its options translated, all in one request", async () => {
    const onAnswer = renderCard()
    expect(await screen.findByText("哪些会话？")).toBeInTheDocument()
    expect(screen.getByText("全部会话")).toBeInTheDocument()
    expect(screen.getByText("按大小排序。")).toBeInTheDocument()
    expect(screen.getByText(ask.recommended)).toBeInTheDocument()
    expect(translateTexts).toHaveBeenCalledTimes(1)

    // Picking a translated option answers with the option as the agent wrote
    // it.
    await userEvent.click(screen.getByText("全部会话"))
    await userEvent.click(screen.getByRole("button", { name: ask.submit }))
    expect(onAnswer).toHaveBeenCalledWith("q-1", {
      answers: [{ questionId: "qa", labels: ["All sessions (Recommended)"] }],
      declined: false,
    })
  })

  it("switches back to the original with the card's button", async () => {
    renderCard()
    await screen.findByText("哪些会话？")
    await userEvent.click(
      screen.getByRole("button", { name: ask.showOriginal })
    )
    expect(screen.getByText("Which sessions?")).toBeInTheDocument()
  })

  it("waits for the button with question cards not translated on their own", async () => {
    settings = view({ question_auto: false })
    renderCard()
    await act(async () => {})
    expect(screen.getByText("Which sessions?")).toBeInTheDocument()
    expect(translateTexts).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole("button", { name: ask.translateQuestion })
    )
    expect(await screen.findByText("哪些会话？")).toBeInTheDocument()
  })

  it("offers nothing without an engine", async () => {
    settings = view({ has_dashscope_key: false })
    renderCard()
    await act(async () => {})
    expect(
      screen.queryByRole("button", { name: ask.translateQuestion })
    ).toBeNull()
    expect(translateTexts).not.toHaveBeenCalled()
  })
})

describe("a typed answer in the agent's language", () => {
  beforeEach(() => {
    settings = view({ question_auto: false })
  })

  it("is translated by hand, and put back the same way", async () => {
    renderCard()
    await typeOther("大的也要")
    await userEvent.click(
      screen.getByRole("button", { name: ask.translateAnswer })
    )
    const field = screen.getByRole("textbox", { name: ask.other })
    await waitFor(() => expect(field).toHaveValue("Large ones too"))
    expect(translateTexts).toHaveBeenCalledWith(["大的也要"], "en")

    await userEvent.click(
      screen.getByRole("button", { name: ask.restoreAnswer })
    )
    expect(field).toHaveValue("大的也要")
  })

  it("goes out translated and keeps what was typed", async () => {
    const onAnswer = renderCard()
    await typeOther("大的也要")
    await userEvent.click(
      screen.getByRole("button", { name: ask.translateAnswer })
    )
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: ask.other })).toHaveValue(
        "Large ones too"
      )
    )
    await userEvent.click(screen.getByRole("button", { name: ask.submit }))
    expect(onAnswer).toHaveBeenCalledWith("q-1", {
      answers: [{ questionId: "qa", labels: ["Large ones too"] }],
      declined: false,
    })
    expect(saveSentOriginal).toHaveBeenCalledWith(
      ["Large ones too"],
      "大的也要"
    )
  })

  it("is translated on submit with translate-when-sending on", async () => {
    settings = view({ question_auto: false, input_translate_on_send: true })
    const onAnswer = renderCard()
    await typeOther("大的也要")
    await userEvent.click(screen.getByRole("button", { name: ask.submit }))
    await waitFor(() =>
      expect(onAnswer).toHaveBeenCalledWith("q-1", {
        answers: [{ questionId: "qa", labels: ["Large ones too"] }],
        declined: false,
      })
    )
    expect(saveSentOriginal).toHaveBeenCalledWith(
      ["Large ones too"],
      "大的也要"
    )
  })

  it("is not sent when that translation fails", async () => {
    settings = view({ question_auto: false, input_translate_on_send: true })
    translateTexts.mockRejectedValueOnce(new Error("offline"))
    const onAnswer = renderCard()
    await typeOther("大的也要")
    await userEvent.click(screen.getByRole("button", { name: ask.submit }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(onAnswer).not.toHaveBeenCalled()
    expect(screen.getByRole("textbox", { name: ask.other })).toHaveValue(
      "大的也要"
    )
  })

  it("never sends a secret to the engine", async () => {
    settings = view({ question_auto: false, input_translate_on_send: true })
    const onAnswer = renderCard(question(true))
    await userEvent.click(screen.getByText(ask.other))
    // A secret's field masks what is typed.
    const field = document.querySelector('input[type="password"]')!
    await userEvent.type(field, "sk-密钥")
    expect(
      screen.queryByRole("button", { name: ask.translateAnswer })
    ).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: ask.submit }))
    await waitFor(() => expect(onAnswer).toHaveBeenCalled())
    expect(translateTexts).not.toHaveBeenCalled()
  })
})
