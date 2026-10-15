import { describe, expect, it } from "vitest"

import { maskForTranslation, splitBlocks } from "./blocks"

describe("splitBlocks", () => {
  it("gives back the original text exactly when joined", () => {
    const text =
      "Plan:\n\n1. First `code`\n2. Second\n\n```ts\nconst a = 1\n```\n\nDone.   \n"
    expect(
      splitBlocks(text)
        .map((b) => b.raw)
        .join("")
    ).toBe(text)
  })

  it("sorts blocks into prose, code and whitespace", () => {
    const blocks = splitBlocks(
      "Intro.\n\n```ts\nx()\n```\n\n    indented()\n\n---\n\n🎉 42\n\n<details>x</details>\n\nOutro."
    )
    const kinds = blocks
      .filter((b) => b.kind !== "space")
      .map((b) => [b.kind, b.body])
    expect(kinds).toEqual([
      ["prose", "Intro."],
      ["code", "```ts\nx()\n```"],
      ["code", "indented()"],
      ["code", "---"],
      ["code", "🎉 42"],
      ["code", "<details>x</details>"],
      ["prose", "Outro."],
    ])
  })

  it("keeps the whitespace around a body out of it", () => {
    const [block] = splitBlocks("## Heading\n")
    expect(block).toMatchObject({ lead: "", body: "## Heading", trail: "\n" })
  })
})

describe("maskForTranslation", () => {
  it("protects code nested in a list item and restores it byte for byte", () => {
    const body =
      "- Run the tests:\n\n  ```bash\n  pnpm test\n  ```\n- Then ship it."
    const masked = maskForTranslation(body)
    expect(masked.text).toBe("- Run the tests:\n\n  ⟦C0⟧\n- Then ship it.")
    expect(masked.restore("- 运行测试：\n\n  ⟦C0⟧\n- 然后发布。")).toBe(
      "- 运行测试：\n\n  ```bash\n  pnpm test\n  ```\n- 然后发布。"
    )
  })

  it("protects link targets and bare URLs but not inline code", () => {
    const masked = maskForTranslation(
      "See [the docs](https://example.com/a_b) and https://x.dev/y, or `https://keep.me`."
    )
    expect(masked.text).toBe(
      "See [the docs](⟦U0⟧) and ⟦U1⟧, or `https://keep.me`."
    )
    expect(
      masked.restore("见[文档](⟦U0⟧)和 ⟦U1⟧，或 `https://keep.me`。")
    ).toBe(
      "见[文档](https://example.com/a_b)和 https://x.dev/y，或 `https://keep.me`。"
    )
  })

  it("leaves an unknown placeholder alone", () => {
    expect(maskForTranslation("plain").restore("⟦C9⟧ 文本")).toBe("⟦C9⟧ 文本")
  })
})
