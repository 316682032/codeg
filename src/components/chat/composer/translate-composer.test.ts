import { Editor } from "@tiptap/core"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { buildComposerExtensions } from "./editor-config"
import { serializeDocToDisplayText } from "./to-prompt-blocks"
import {
  applyComposerTranslation,
  originalOfDraft,
  recordOriginals,
  snapshotForTranslation,
  type ComposerOriginals,
} from "./translate-composer"
import type { ReferenceAttrs } from "./types"

const FILE: ReferenceAttrs = {
  refType: "file",
  id: "src/a.ts",
  label: "a.ts",
  uri: "file:///repo/src/a.ts",
  meta: null,
}

let editor: Editor

beforeEach(() => {
  editor = new Editor({ extensions: buildComposerExtensions() })
})
afterEach(() => editor?.destroy())

/** "帮我看看 [a.ts] 为什么会闪" + a second line after a hard break. */
function seed() {
  editor.commands.insertContent("帮我看看 ")
  editor.commands.insertReference(FILE)
  editor.commands.insertContent(" 为什么会闪")
  editor.commands.setHardBreak()
  editor.commands.insertContent("别改 `buildDraft`")
}

function references(): ReferenceAttrs[] {
  const found: ReferenceAttrs[] = []
  editor.state.doc.descendants((node) => {
    if (node.type.name === "reference") found.push(node.attrs as ReferenceAttrs)
  })
  return found
}

describe("snapshotForTranslation", () => {
  it("stands a placeholder in for each badge and a newline for a hard break", () => {
    seed()
    const snapshot = snapshotForTranslation(editor.state.doc, "en")
    expect(snapshot.segments.map((s) => s.text)).toEqual([
      "帮我看看 ⟦R0⟧ 为什么会闪\n别改 `buildDraft`",
    ])
  })

  it("skips paragraphs already in the target language", () => {
    editor.commands.setContent("<p>Already English.</p><p>中文这一段</p>")
    const snapshot = snapshotForTranslation(editor.state.doc, "en")
    expect(snapshot.segments.map((s) => s.text)).toEqual(["中文这一段"])
  })

  it("keeps a typed command and a path out of the translation", () => {
    editor.commands.setContent("<p>/review 看看 /Users/me/a.ts</p>")
    const [segment] = snapshotForTranslation(editor.state.doc, "en").segments
    expect(segment.text).toBe("⟦S0⟧ 看看 ⟦S1⟧")
    expect(segment.restore("⟦S0⟧ look at ⟦S1⟧")).toBe(
      "/review look at /Users/me/a.ts"
    )
  })
})

describe("applyComposerTranslation", () => {
  it("rebuilds around the original badge, and one undo restores the text", () => {
    seed()
    const before = editor.getJSON()
    const snapshot = snapshotForTranslation(editor.state.doc, "en")

    const outcome = applyComposerTranslation(editor, snapshot, [
      "Look at why ⟦R0⟧ flickers\nDo not change `buildDraft`",
    ])
    expect(outcome).toBe("applied")
    expect(editor.getText({ blockSeparator: "\n" })).toContain(
      "Do not change `buildDraft`"
    )
    expect(references()).toEqual([FILE])

    editor.commands.undo()
    expect(editor.getJSON()).toEqual(before)
  })

  it("does not merge into the typing just before it", () => {
    editor.commands.insertContent("中文")
    const snapshot = snapshotForTranslation(editor.state.doc, "en")
    applyComposerTranslation(editor, snapshot, ["Chinese"])
    editor.commands.undo()
    expect(editor.getText()).toBe("中文")
  })

  it("refuses a document that changed since the snapshot", () => {
    editor.commands.insertContent("中文")
    const snapshot = snapshotForTranslation(editor.state.doc, "en")
    editor.commands.insertContent("再加")
    expect(applyComposerTranslation(editor, snapshot, ["Chinese"])).toBe(
      "stale"
    )
    expect(editor.getText()).toBe("中文再加")
  })

  it("refuses a translation that lost or doubled a badge", () => {
    seed()
    const snapshot = snapshotForTranslation(editor.state.doc, "en")
    expect(
      applyComposerTranslation(editor, snapshot, ["Look at why it flickers"])
    ).toBe("damaged")
    expect(applyComposerTranslation(editor, snapshot, ["⟦R0⟧ and ⟦R0⟧"])).toBe(
      "damaged"
    )
    expect(applyComposerTranslation(editor, snapshot, [null])).toBe("damaged")
    expect(references()).toEqual([FILE])
  })
})

describe("the original behind a translated draft", () => {
  /** Translate the editor's draft with `translate`, recording originals. */
  function translate(
    translateText: (text: string) => string,
    previous: ComposerOriginals | null = null
  ): ComposerOriginals {
    const snapshot = snapshotForTranslation(editor.state.doc, "en")
    expect(
      applyComposerTranslation(
        editor,
        snapshot,
        snapshot.segments.map((s) => translateText(s.text))
      )
    ).toBe("applied")
    return recordOriginals(snapshot.doc, editor.state.doc, previous)
  }

  function originalText(originals: ComposerOriginals): string | null {
    const original = originalOfDraft(editor.state.doc, originals)
    return original ? serializeDocToDisplayText(original).trim() : null
  }

  it("is the draft as typed, badges and all", () => {
    seed()
    const originals = translate(
      () => "Look at ⟦R0⟧, why does it flicker\nDon't touch ⟦C0⟧"
    )
    expect(originalText(originals)).toBe(
      "帮我看看 [a.ts](file:///repo/src/a.ts) 为什么会闪\n别改 `buildDraft`"
    )
  })

  it("goes back past every translation of the same draft", () => {
    editor.commands.setContent("<p>第一段</p>")
    let originals = translate(() => "First paragraph")
    // A paragraph added afterwards and translated on its own.
    editor.commands.setContent("<p>First paragraph</p><p>第二段</p>")
    originals = translate(() => "Second paragraph", originals)
    expect(originalText(originals)).toBe("第一段\n第二段")
  })

  it("survives a word fixed after translating", () => {
    editor.commands.setContent("<p>请检查一下这台电脑的配置</p>")
    const originals = translate(
      () => "Please check the configuration of this computer"
    )
    editor.commands.setContent("<p>Please check the specs of this computer</p>")
    expect(originalText(originals)).toBe("请检查一下这台电脑的配置")
  })

  it("is nothing for a different draft loaded since", () => {
    editor.commands.setContent("<p>请检查一下</p>")
    const originals = translate(() => "Please check")
    editor.commands.setContent("<p>Something else entirely</p>")
    expect(originalText(originals)).toBeNull()
  })
})
