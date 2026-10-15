import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TranslateResult } from "@/lib/api"

const translateTexts =
  vi.fn<
    (
      texts: string[],
      target: string,
      options?: { groups?: number[] }
    ) => Promise<TranslateResult>
  >()
vi.mock("@/lib/api", () => ({
  translateTexts: (
    texts: string[],
    target: string,
    options?: { groups?: number[] }
  ) => translateTexts(texts, target, options),
}))

import {
  forgetFailedTranslations,
  getTranslation,
  requestTranslations,
  resetTranslationStoreForTests,
  setTranslationErrorHandler,
} from "./translation-store"

/** A request the test resolves by hand, to hold one in flight. */
function deferred() {
  let resolve!: (value: TranslateResult) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<TranslateResult>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  resetTranslationStoreForTests()
  translateTexts.mockReset()
})
afterEach(() => resetTranslationStoreForTests())

describe("translation store", () => {
  it("sends what is asked for in one tick as one request, a group per text", async () => {
    translateTexts.mockImplementation(async (texts) => ({
      translations: texts.map((t) => `译${t}`),
      model: "qwen-mt-flash",
    }))

    // A finished reply's two text parts, asked for by sibling components.
    requestTranslations(["One.", "Two."], "zh-CN")
    requestTranslations(["Three."], "zh-CN")
    expect(translateTexts).not.toHaveBeenCalled()
    expect(getTranslation("One.", "zh-CN")).toEqual({ status: "pending" })

    await flush()
    expect(translateTexts).toHaveBeenCalledTimes(1)
    expect(translateTexts.mock.calls[0]).toEqual([
      ["One.", "Two.", "Three."],
      "zh-CN",
      { groups: [0, 0, 1] },
    ])
    expect(getTranslation("Two.", "zh-CN")).toEqual({
      status: "done",
      text: "译Two.",
    })
  })

  it("waits for the request in flight, then sends what arrived meanwhile", async () => {
    const first = deferred()
    const second = deferred()
    translateTexts
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    requestTranslations(["One."], "zh-CN")
    await flush()
    expect(translateTexts).toHaveBeenCalledTimes(1)

    requestTranslations(["Two.", "Three."], "zh-CN")
    requestTranslations(["Two."], "zh-CN")
    await flush()
    expect(translateTexts).toHaveBeenCalledTimes(1)

    first.resolve({ translations: ["一。"], model: "qwen-mt-flash" })
    await flush()
    expect(getTranslation("One.", "zh-CN")).toEqual({
      status: "done",
      text: "一。",
    })
    expect(translateTexts).toHaveBeenCalledTimes(2)
    expect(translateTexts.mock.calls[1]).toEqual([
      ["Two.", "Three."],
      "zh-CN",
      { groups: [0, 0] },
    ])

    second.resolve({ translations: ["二。", null], model: "qwen-mt-flash" })
    await flush()
    expect(getTranslation("Two.", "zh-CN")).toEqual({
      status: "done",
      text: "二。",
    })
    // A segment the backend could not translate faithfully shows as written.
    expect(getTranslation("Three.", "zh-CN")).toEqual({ status: "failed" })
  })

  it("puts protected code back into the translation", async () => {
    translateTexts.mockImplementation(async (texts) => ({
      translations: texts.map((t) => t.replace("Run:", "运行：")),
      model: "qwen-mt-flash",
    }))
    const body = "- Run:\n\n  ```sh\n  pnpm test\n  ```"
    requestTranslations([body], "zh-CN")
    await flush()
    expect(translateTexts.mock.calls[0][0]).toEqual(["- Run:\n\n  ⟦C0⟧"])
    expect(getTranslation(body, "zh-CN")).toEqual({
      status: "done",
      text: "- 运行：\n\n  ```sh\n  pnpm test\n  ```",
    })
  })

  it("reports a failed request once and does not retry until asked", async () => {
    const onError = vi.fn()
    setTranslationErrorHandler(onError)
    translateTexts.mockRejectedValueOnce(new Error("offline"))

    requestTranslations(["One."], "zh-CN")
    await flush()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(getTranslation("One.", "zh-CN")).toEqual({ status: "failed" })

    requestTranslations(["One."], "zh-CN")
    await flush()
    expect(translateTexts).toHaveBeenCalledTimes(1)

    translateTexts.mockResolvedValueOnce({
      translations: ["一。"],
      model: null,
    })
    forgetFailedTranslations(["One."])
    requestTranslations(["One."], "zh-CN")
    await flush()
    expect(getTranslation("One.", "zh-CN")).toEqual({
      status: "done",
      text: "一。",
    })
  })

  it("keeps targets apart", async () => {
    translateTexts.mockImplementation(async (texts, target) => ({
      translations: texts.map((t) => `${target}:${t}`),
      model: null,
    }))
    requestTranslations(["Hi."], "zh-CN")
    requestTranslations(["Hi."], "ja")
    await flush()
    expect(translateTexts).toHaveBeenCalledTimes(2)
    expect(getTranslation("Hi.", "zh-CN")).toEqual({
      status: "done",
      text: "zh-CN:Hi.",
    })
    expect(getTranslation("Hi.", "ja")).toEqual({
      status: "done",
      text: "ja:Hi.",
    })
  })
})
