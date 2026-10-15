import { describe, expect, it } from "vitest"

import { isAlreadyInTarget, resolveOutputTarget } from "./languages"

describe("isAlreadyInTarget", () => {
  it("recognises Chinese, ignoring code and paths", () => {
    expect(isAlreadyInTarget("我修改了 `useEditor` 的依赖", "zh-CN")).toBe(true)
    expect(isAlreadyInTarget("I changed `useEditor`.", "zh-CN")).toBe(false)
    expect(
      isAlreadyInTarget(
        "看 src/components/chat/message-input.tsx 这个文件",
        "zh-CN"
      )
    ).toBe(true)
  })

  it("does not take Japanese for Chinese", () => {
    expect(isAlreadyInTarget("テストを実行しました", "zh-CN")).toBe(false)
    expect(isAlreadyInTarget("テストを実行しました", "ja")).toBe(true)
  })

  it("treats Latin text as English and never skips other Latin targets", () => {
    expect(isAlreadyInTarget("Run the tests next.", "en")).toBe(true)
    expect(isAlreadyInTarget("帮我跑一下测试", "en")).toBe(false)
    expect(isAlreadyInTarget("Run the tests next.", "es")).toBe(false)
  })

  it("counts text without letters as done", () => {
    expect(isAlreadyInTarget("42 → 43 ✅", "zh-CN")).toBe(true)
  })
})

describe("resolveOutputTarget", () => {
  it("prefers the chosen language, then the UI language, then English", () => {
    expect(resolveOutputTarget({ output_target: "ja" }, "zh-CN")).toBe("ja")
    expect(resolveOutputTarget({ output_target: null }, "zh-CN")).toBe("zh-CN")
    expect(resolveOutputTarget(null, "xx")).toBe("en")
  })
})
