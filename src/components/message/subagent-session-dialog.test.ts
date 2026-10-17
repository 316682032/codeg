import { describe, expect, it } from "vitest"

import {
  inProgressToolCallsByTurn,
  mergeAssistantRuns,
} from "./subagent-session-dialog"
import type {
  AdaptedContentPart,
  AdaptedMessage,
} from "@/lib/adapters/ai-elements-adapter"
import type { ContentBlock, MessageTurn } from "@/lib/types"

function turn(id: string, blocks: ContentBlock[]): MessageTurn {
  return { id, role: "assistant", blocks, timestamp: "2026-10-17T00:00:00Z" }
}

const use = (id: string, status?: string): ContentBlock => ({
  type: "tool_use",
  tool_use_id: id,
  tool_name: "Bash",
  input_preview: "{}",
  ...(status ? { status } : {}),
})

const result = (id: string): ContentBlock => ({
  type: "tool_result",
  tool_use_id: id,
  output_preview: "ok",
  is_error: false,
})

describe("inProgressToolCallsByTurn", () => {
  it("takes a call the last turn has no result for as running, when trusted", () => {
    // A cut-off call in an earlier turn is not the one the child waits on.
    const turns = [
      turn("t0", [use("cut-off")]),
      turn("t1", [use("done"), result("done"), use("running")]),
    ]
    expect(inProgressToolCallsByTurn(turns, true)).toEqual(
      new Map([[1, new Set(["running"])]])
    )
    // Without the guarantee a missing result proves nothing.
    expect(inProgressToolCallsByTurn(turns, false)).toEqual(new Map())
  })

  it("lets a recorded status decide over the missing-result rule", () => {
    const turns = [
      turn("t0", [use("a", "in_progress"), result("a"), use("b", "completed")]),
    ]
    expect(inProgressToolCallsByTurn(turns, true)).toEqual(
      new Map([[0, new Set(["a"])]])
    )
  })
})

describe("mergeAssistantRuns", () => {
  const call = (
    id: string
  ): Extract<AdaptedContentPart, { type: "tool-call" }> => ({
    type: "tool-call",
    toolCallId: id,
    toolName: "bash",
    input: "{}",
    state: "output-available",
  })
  const group = (...ids: string[]): AdaptedContentPart => ({
    type: "tool-group",
    items: ids.map(call),
    isStreaming: false,
  })
  const message = (
    id: string,
    role: AdaptedMessage["role"],
    content: AdaptedContentPart[]
  ): AdaptedMessage => ({ id, role, content, timestamp: "2026-10-17" })

  it("folds a run of assistant messages into one, tool calls into one pill", () => {
    const merged = mergeAssistantRuns([
      message("u", "user", [{ type: "text", text: "Find the bug" }]),
      message("a1", "assistant", [group("t1")]),
      message("a2", "assistant", [group("t2")]),
      message("a3", "assistant", [{ type: "text", text: "Found it." }]),
    ])
    expect(merged.map((m) => m.id)).toEqual(["u", "a1"])
    const [pill, text] = merged[1].content
    expect(pill.type === "tool-group" && pill.items.length).toBe(2)
    expect(text).toEqual({ type: "text", text: "Found it." })
  })

  it("keeps a user message between assistant runs as their boundary", () => {
    const merged = mergeAssistantRuns([
      message("a1", "assistant", [group("t1")]),
      message("u", "user", [{ type: "text", text: "more" }]),
      message("a2", "assistant", [group("t2")]),
    ])
    expect(merged.map((m) => m.id)).toEqual(["a1", "u", "a2"])
  })
})
