import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TranslateResult, TranslationSettingsView } from "@/lib/api"
import enMessages from "@/i18n/messages/en.json"

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
const getSentOriginals = vi.fn<(texts: string[]) => Promise<(string | null)[]>>(
  async (texts) => texts.map((t) => (t === "Hello" ? "你好" : null))
)
const saveSentOriginal = vi.fn<
  (sent: string[], original: string) => Promise<void>
>(async () => {})
vi.mock("@/lib/api", () => ({
  translateTexts: (texts: string[], target: string, options?: Options) =>
    translateTexts(texts, target, options),
  getSentOriginals: (texts: string[]) => getSentOriginals(texts),
  saveSentOriginal: (sent: string[], original: string) =>
    saveSentOriginal(sent, original),
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

import {
  rememberSentOriginal,
  resetSentOriginalsForTests,
} from "@/lib/translation/sent-originals"
import {
  forgetAllTranslations,
  resetTranslationStoreForTests,
} from "@/lib/translation/translation-store"

import {
  TranslationProvider,
  useSentOriginal,
  useTranslatedMarkdown,
  useTurnTranslation,
} from "./translation-context"

function view(overrides: Partial<TranslationSettingsView> = {}) {
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
  } satisfies TranslationSettingsView
}

function Shown({
  text,
  settled,
  translatable = true,
}: {
  text: string
  settled: boolean
  translatable?: boolean
}) {
  return (
    <pre data-testid="shown">
      {useTranslatedMarkdown(text, { translatable, settled }).markdown}
    </pre>
  )
}

let copied: string | null = null

function ReplyButton({
  texts,
  thinking,
}: {
  texts: string[]
  thinking?: string[]
}) {
  const turn = useTurnTranslation(texts, thinking)
  if (!turn.visible) return null
  return (
    <>
      <button type="button" onClick={turn.toggle}>
        {turn.translated ? "original" : "translate"}
      </button>
      <button type="button" onClick={() => (copied = turn.shownReplyText())}>
        copy
      </button>
    </>
  )
}

function SentBubble({ sent }: { sent: string }) {
  const { original, showing, toggle } = useSentOriginal(sent)
  return (
    <div>
      <p data-testid={`bubble-${sent}`}>{showing ? original : sent}</p>
      {original !== null && (
        <button type="button" onClick={toggle}>
          {showing ? `sent:${sent}` : `original:${sent}`}
        </button>
      )}
    </div>
  )
}

function renderWithProvider(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <TranslationProvider>{ui}</TranslationProvider>
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  resetTranslationStoreForTests()
  resetSentOriginalsForTests()
  translateTexts.mockClear()
  getSentOriginals.mockClear()
  saveSentOriginal.mockClear()
  copied = null
  settings = view()
})
afterEach(() => {
  resetTranslationStoreForTests()
  resetSentOriginalsForTests()
})

describe("useTranslatedMarkdown", () => {
  it("translates nothing while the turn is still being written", async () => {
    renderWithProvider(
      <Shown text={"One.\n\n```ts\nx()\n```\n\nTwo"} settled={false} />
    )
    await act(async () => {})
    expect(screen.getByTestId("shown").textContent).toBe(
      "One.\n\n```ts\nx()\n```\n\nTwo"
    )
    expect(translateTexts).not.toHaveBeenCalled()
  })

  it("translates the whole text in one request once the turn finishes", async () => {
    const text = "One.\n\n```ts\nx()\n```\n\nTwo."
    const { rerender } = renderWithProvider(
      <Shown text={text} settled={false} />
    )
    rerender(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TranslationProvider>
          <Shown text={text} settled />
        </TranslationProvider>
      </NextIntlClientProvider>
    )
    await waitFor(() =>
      expect(screen.getByTestId("shown").textContent).toBe(
        "译:One.\n\n```ts\nx()\n```\n\n译:Two."
      )
    )
    // Both paragraphs as one group: the engine sees them together.
    expect(translateTexts.mock.calls).toEqual([
      [["One.", "Two."], "zh-CN", { groups: [0, 0] }],
    ])
  })

  it("asks again for translations dropped after the engine changed", async () => {
    renderWithProvider(<Shown text="One." settled />)
    await waitFor(() =>
      expect(screen.getByTestId("shown").textContent).toBe("译:One.")
    )
    act(() => forgetAllTranslations())
    await waitFor(() => expect(translateTexts).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(screen.getByTestId("shown").textContent).toBe("译:One.")
    )
  })

  it("leaves text alone that is not a reply, or with no engine configured", async () => {
    renderWithProvider(<Shown text="One." settled translatable={false} />)
    expect(screen.getByTestId("shown").textContent).toBe("One.")

    settings = view({ has_dashscope_key: false })
    renderWithProvider(<Shown text="Two." settled />)
    await act(async () => {})
    expect(translateTexts).not.toHaveBeenCalled()
  })
})

describe("useTurnTranslation", () => {
  it("translates a reply on demand when auto-translation is off, and switches back", async () => {
    settings = view({ output_auto: false })
    renderWithProvider(
      <>
        <ReplyButton texts={["One."]} />
        <Shown text="One." settled />
      </>
    )
    expect(screen.getByTestId("shown").textContent).toBe("One.")

    await userEvent.click(screen.getByRole("button", { name: "translate" }))
    await waitFor(() =>
      expect(screen.getByTestId("shown").textContent).toBe("译:One.")
    )

    await userEvent.click(screen.getByRole("button", { name: "original" }))
    expect(screen.getByTestId("shown").textContent).toBe("One.")
  })

  it("offers nothing for a reply already in the target language", () => {
    renderWithProvider(<ReplyButton texts={["已经是中文了。"]} />)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("covers the reply's thinking: offered for it, and switches it too", async () => {
    settings = view({ output_auto: false })
    renderWithProvider(
      <>
        {/* The reply itself is already Chinese; only the thinking is not. */}
        <ReplyButton texts={["已经是中文了。"]} thinking={["Plan."]} />
        <Shown text="Plan." settled />
      </>
    )
    await userEvent.click(screen.getByRole("button", { name: "translate" }))
    await waitFor(() =>
      expect(screen.getByTestId("shown").textContent).toBe("译:Plan.")
    )
  })

  it("copies the reply as it reads: translated while that shows", async () => {
    renderWithProvider(
      <>
        <ReplyButton texts={["One.\n\nTwo.", "Three."]} />
        <Shown text={"One.\n\nTwo."} settled />
        <Shown text="Three." settled />
      </>
    )
    await waitFor(() =>
      expect(screen.getAllByTestId("shown")[1].textContent).toBe("译:Three.")
    )
    await userEvent.click(screen.getByRole("button", { name: "copy" }))
    expect(copied).toBe("译:One.\n\n译:Two.\n译:Three.")

    await userEvent.click(screen.getByRole("button", { name: "original" }))
    await userEvent.click(screen.getByRole("button", { name: "copy" }))
    // Nothing shows translated: the caller copies the text as written.
    expect(copied).toBeNull()
  })
})

describe("useSentOriginal", () => {
  it("looks every bubble up in one request and switches to the original", async () => {
    renderWithProvider(
      <>
        <SentBubble sent="Hello" />
        <SentBubble sent="Typed in English" />
      </>
    )
    const toggle = await screen.findByRole("button", { name: "original:Hello" })
    expect(getSentOriginals.mock.calls).toEqual([
      [["Hello", "Typed in English"]],
    ])
    // Sent as written: nothing to switch to.
    expect(screen.getAllByRole("button")).toHaveLength(1)

    await userEvent.click(toggle)
    expect(screen.getByTestId("bubble-Hello").textContent).toBe("你好")
    await userEvent.click(screen.getByRole("button", { name: "sent:Hello" }))
    expect(screen.getByTestId("bubble-Hello").textContent).toBe("Hello")
  })

  it("knows a message just sent at once, and saves it for later", async () => {
    rememberSentOriginal(["Fresh one", "Fresh one"], " 新的 ")
    renderWithProvider(<SentBubble sent="Fresh one" />)
    await userEvent.click(
      screen.getByRole("button", { name: "original:Fresh one" })
    )
    expect(screen.getByTestId("bubble-Fresh one").textContent).toBe("新的")
    expect(getSentOriginals).not.toHaveBeenCalled()
    expect(saveSentOriginal).toHaveBeenCalledWith(["Fresh one"], " 新的 ")
  })

  it("looks nothing up while translation is not set up", async () => {
    settings = view({ has_dashscope_key: false })
    renderWithProvider(<SentBubble sent="Hello" />)
    await act(async () => {})
    expect(getSentOriginals).not.toHaveBeenCalled()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
