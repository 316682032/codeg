import { act, cleanup, render, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TranslateResult, TranslationSettingsView } from "@/lib/api"
import enMessages from "@/i18n/messages/en.json"

/**
 * A translated reply through the REAL Streamdown pipeline. Streamdown memoizes
 * tables, lists and paragraphs by their source span alone, so a table whose
 * last row is all code spans the same lines and columns translated or not —
 * without a remount it kept showing the original header (found in the app,
 * 2026-10-15).
 */

const mocks = vi.hoisted(() => ({
  translateTexts: vi.fn<
    (texts: string[], target: string) => Promise<TranslateResult>
  >(async (texts) => ({
    translations: texts.map((t) =>
      t
        .replace("说明。", "Notes.")
        .replace("文件", "File")
        .replace("先读配置。", "Read the config first.")
    ),
    model: "qwen-mt-flash",
  })),
}))

const SETTINGS: TranslationSettingsView = {
  provider: "dashscope",
  dashscope_model: "qwen-mt-flash",
  dashscope_base_url: "",
  tokenhub_model: "hy-mt2-plus",
  tokenhub_base_url: "",
  fallback_enabled: true,
  output_auto: true,
  output_target: "en",
  input_target: "en",
  input_translate_on_send: false,
  glossary: [],
  has_dashscope_key: true,
  has_tokenhub_key: false,
}

vi.mock("@/hooks/use-translation-settings", () => ({
  useTranslationSettings: () => SETTINGS,
  isTranslationConfigured: () => true,
}))

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  translateTexts: (texts: string[], target: string) =>
    mocks.translateTexts(texts, target),
}))

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

vi.mock("@/lib/platform", () => ({ openUrl: vi.fn() }))

vi.mock("@/lib/transport", () => ({
  isDesktop: () => false,
  getActiveRemoteConnectionId: () => null,
}))

vi.mock("@/contexts/active-folder-context", () => ({
  useActiveFolder: () => ({ activeFolder: { path: "/repo" } }),
}))

vi.mock("@/contexts/workspace-context", () => ({
  useOptionalWorkspaceActions: () => null,
  useWorkspaceActions: () => ({ openFilePreview: vi.fn() }),
}))

import {
  resetTranslationStoreForTests,
  setBlockOverrides,
} from "@/lib/translation/translation-store"

import { ContentPartsRenderer } from "./content-parts-renderer"
import { TranslationProvider } from "./translation-context"

const TABLE = "| 文件 | SHA-256 |\n|---|---|\n| `src/a.rs` | `b8997f87` |"
const REPLY = `说明。\n\n${TABLE}`

function renderReply() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <TranslationProvider>
        <ContentPartsRenderer
          parts={[{ type: "text", text: REPLY }]}
          role="assistant"
        />
      </TranslationProvider>
    </NextIntlClientProvider>
  )
}

function headers(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("th")).map(
    (th) => th.textContent?.trim() ?? ""
  )
}

beforeEach(() => {
  resetTranslationStoreForTests()
  mocks.translateTexts.mockClear()
})
afterEach(() => {
  cleanup()
  resetTranslationStoreForTests()
})

describe("a translated reply (real Streamdown)", () => {
  it("repaints a table that spans the same source once translated", async () => {
    const { container } = renderReply()
    await waitFor(() => expect(headers(container)).toEqual(["File", "SHA-256"]))
    expect(container.textContent).toContain("Notes.")
    // Code inside the table is untouched.
    expect(container.querySelector("td code")?.textContent).toBe("src/a.rs")
  })

  it("repaints it again when switched back to the original", async () => {
    const { container } = renderReply()
    await waitFor(() => expect(headers(container)).toEqual(["File", "SHA-256"]))

    act(() => setBlockOverrides(["说明。", TABLE], "original"))
    expect(headers(container)).toEqual(["文件", "SHA-256"])
    expect(container.textContent).toContain("说明。")
  })
})

describe("translated thinking", () => {
  function renderThinking() {
    return render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TranslationProvider>
          <ContentPartsRenderer
            parts={[
              { type: "reasoning", content: "先读配置。", isStreaming: false },
            ]}
            role="assistant"
          />
        </TranslationProvider>
      </NextIntlClientProvider>
    )
  }

  it("costs nothing while folded, and opens translated", async () => {
    const { container, getByRole } = renderThinking()
    // Folded by default: nothing asked for.
    await act(async () => {})
    expect(mocks.translateTexts).not.toHaveBeenCalled()

    await act(async () => getByRole("button").click())
    await waitFor(() =>
      expect(container.textContent).toContain("Read the config first.")
    )
    expect(container.textContent).not.toContain("先读配置。")
    expect(mocks.translateTexts).toHaveBeenCalledTimes(1)
  })

  it("shows the thinking as written when its reply is switched back", async () => {
    const { container, getByRole } = renderThinking()
    await act(async () => getByRole("button").click())
    await waitFor(() =>
      expect(container.textContent).toContain("Read the config first.")
    )

    act(() => setBlockOverrides(["先读配置。"], "original"))
    expect(container.textContent).toContain("先读配置。")
  })
})
