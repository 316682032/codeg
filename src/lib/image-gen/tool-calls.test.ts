import { describe, expect, it } from "vitest"

import type { AdaptedToolCallPart } from "@/lib/adapters/ai-elements-adapter"
import {
  inferLiveToolName,
  normalizeToolName,
} from "@/lib/tool-call-normalization"

import {
  foldCollectCalls,
  isGoneQuestionOutput,
  isImageJobTool,
  mergeImageJobResults,
  parseImageGenerateInput,
  parseImageJobOutput,
  pendingQuestionId,
  type AdaptedImageJobPart,
} from "./tool-calls"

// The texts below are what `render_image_jobs` / `render_ask_outcome` in
// `src-tauri/src/acp/delegation/fork_tools.rs` write.
const SAVED =
  "Image saved to /Users/me/My Pictures (old)/cat.png (1024x1024, image/png, gpt-image-1 via OpenAI, 12.3 s). job_id=img-abc"
const RUNNING =
  "Still generating (job_id=img-abc, 45.0 s so far).\n" +
  'Call image_get_result with job_ids ["img-abc"] to wait for the rest; do not start the same image again.'
const PENDING =
  'The user has not answered yet; the question is still in front of them. Call get_question_answer with question_id "q-1" to keep waiting for the answer.'
const GONE =
  "That question is no longer waiting for an answer: it was withdrawn, or its answer was already collected."

function mcp(text: string, extra: unknown[] = []): string {
  return JSON.stringify({
    content: [{ type: "text", text }, ...extra],
    isError: false,
  })
}

function call(
  toolName: string,
  output: string | null,
  input: Record<string, unknown> = {},
  id = toolName
): AdaptedToolCallPart {
  return {
    type: "tool-call",
    toolCallId: id,
    toolName,
    input: JSON.stringify(input),
    state: output === null ? "input-available" : "output-available",
    output,
  }
}

describe("collect tool names", () => {
  it.each([
    ["image_generate", "image_generate"],
    ["mcp__codeg-mcp__image_generate", "image_generate"],
    ["codeg-mcp/image_get_result", "image_get_result"],
    ["codeg-mcp.image_get_result", "image_get_result"],
    ["codeg-mcp_get_question_answer", "get_question_answer"],
    ["mcp__codeg__get_question_answer", "get_question_answer"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeToolName(input)).toBe(expected)
  })

  it("does not match a longer name ending the same way", () => {
    expect(normalizeToolName("ximage_generate")).not.toBe("image_generate")
  })

  it("is not read as a file write from its output_path input", () => {
    expect(
      inferLiveToolName({
        title: "mcp__codeg-mcp__image_generate",
        kind: "other",
        rawInput: JSON.stringify({
          prompt: "a cat",
          output_path: "assets/cat.png",
        }),
      })
    ).toBe("image_generate")
  })

  it("isImageJobTool covers the two image tools only", () => {
    expect(isImageJobTool("mcp__codeg-mcp__image_generate")).toBe(true)
    expect(isImageJobTool("image_get_result")).toBe(true)
    expect(isImageJobTool("get_question_answer")).toBe(false)
    expect(isImageJobTool(null)).toBe(false)
  })
})

describe("parseImageJobOutput", () => {
  it("reads a saved image, path with spaces and parentheses included", () => {
    expect(parseImageJobOutput(mcp(SAVED))).toEqual([
      {
        jobId: "img-abc",
        status: "completed",
        path: "/Users/me/My Pictures (old)/cat.png",
        width: 1024,
        height: 1024,
        mimeType: "image/png",
        model: "gpt-image-1",
        service: "OpenAI",
        elapsedMs: 12300,
      },
    ])
  })

  it("keeps the rewritten prompt and skips the preview image", () => {
    const text = `${SAVED}\nThe service rewrote the prompt as: a tabby cat`
    const [job] = parseImageJobOutput(
      mcp(text, [{ type: "image", data: "AAAA", mimeType: "image/jpeg" }])
    )
    expect(job?.revisedPrompt).toBe("a tabby cat")
  })

  it("reads running, failed and unknown jobs from plain text", () => {
    const text = [
      "Still generating (job_id=img-1, 3.5 s so far).",
      "Image generation failed (job_id=img-2): 401 Unauthorized",
      "Unknown job_id img-3: it was never started here, or its result is no longer kept.",
    ].join("\n")
    expect(parseImageJobOutput(text)).toEqual([
      { jobId: "img-1", status: "running", elapsedMs: 3500 },
      { jobId: "img-2", status: "failed", error: "401 Unauthorized" },
      { jobId: "img-3", status: "unknown" },
    ])
  })

  it("reads a result inside codex's rollout wrapper", () => {
    const wrapped = `Wall time: 12.4s\nOutput:\n${mcp(SAVED)}`
    expect(parseImageJobOutput(wrapped)[0]?.status).toBe("completed")
    expect(pendingQuestionId(`Wall time: 45s\nOutput:\n${mcp(PENDING)}`)).toBe(
      "q-1"
    )
  })

  it("finds nothing in an error that names no job", () => {
    expect(parseImageJobOutput("Image generation is switched off.")).toEqual([])
  })
})

describe("mergeImageJobResults", () => {
  it("lets a later result finish a job", () => {
    const [job] = mergeImageJobResults([mcp(RUNNING), mcp(SAVED)])
    expect(job?.status).toBe("completed")
    expect(job?.path).toBe("/Users/me/My Pictures (old)/cat.png")
  })

  it("never lets an older running report replace a finished one", () => {
    const [job] = mergeImageJobResults([mcp(SAVED), mcp(RUNNING)])
    expect(job?.status).toBe("completed")
  })
})

describe("parseImageGenerateInput", () => {
  it("reads the arguments, also inside Antigravity's envelope", () => {
    const args = { prompt: "a cat", model: "gpt-image-1", output_path: "a.png" }
    const expected = {
      prompt: "a cat",
      model: "gpt-image-1",
      outputPath: "a.png",
    }
    expect(parseImageGenerateInput(JSON.stringify(args))).toEqual(expected)
    expect(
      parseImageGenerateInput(JSON.stringify({ arguments: args }))
    ).toEqual(expected)
    expect(
      parseImageGenerateInput(
        JSON.stringify({
          providerIdentifier: "codeg-mcp",
          toolName: "image_generate",
          args,
        })
      )
    ).toEqual(expected)
    expect(parseImageGenerateInput("not json").prompt).toBeNull()
  })
})

describe("question collect results", () => {
  it("reads the question id of a pending answer", () => {
    expect(pendingQuestionId(mcp(PENDING))).toBe("q-1")
    expect(
      pendingQuestionId(
        JSON.stringify({
          structuredContent: { pending: true, question_id: "q-2" },
        })
      )
    ).toBe("q-2")
    expect(pendingQuestionId(mcp("User answered: A"))).toBeNull()
    expect(pendingQuestionId(null)).toBeNull()
  })

  it("recognises a question that is gone", () => {
    expect(isGoneQuestionOutput(mcp(GONE))).toBe(true)
    expect(isGoneQuestionOutput(mcp(PENDING))).toBe(false)
  })
})

describe("foldCollectCalls", () => {
  const text = { type: "text", text: "Working on it" }

  it("folds image_get_result into the image_generate card of its job", () => {
    const start = call("mcp__codeg-mcp__image_generate", mcp(RUNNING), {
      prompt: "a cat",
    })
    const poll = call("mcp__codeg-mcp__image_get_result", mcp(SAVED), {
      job_ids: ["img-abc"],
    })
    const folded = foldCollectCalls([start, text, poll])
    expect(folded).toHaveLength(2)
    const card = folded[0] as AdaptedImageJobPart
    expect(card.type).toBe("image-job")
    expect(card.call).toBe(start)
    expect(card.polls).toEqual([poll])
    expect(folded[1]).toBe(text)
  })

  it("is idempotent over parts it already folded", () => {
    const start = call("image_generate", mcp(RUNNING))
    const poll = call("image_get_result", mcp(SAVED))
    const once = foldCollectCalls([start, poll])
    const twice = foldCollectCalls(once)
    expect(twice).toEqual(once)
    // Merged sub-turns: a later turn's collect joins an earlier turn's card.
    const later = call("image_get_result", mcp(SAVED), {}, "later")
    const merged = foldCollectCalls([
      ...foldCollectCalls([start]),
      ...foldCollectCalls([later]),
    ])
    expect(merged).toHaveLength(1)
    expect((merged[0] as AdaptedImageJobPart).polls).toEqual([later])
  })

  it("joins a poll that is still waiting by the job ids it asked for", () => {
    const start = call("image_generate", mcp(RUNNING))
    const waiting = call("image_get_result", null, { job_ids: ["img-abc"] })
    const folded = foldCollectCalls([start, waiting])
    expect(folded).toHaveLength(1)
    expect((folded[0] as AdaptedImageJobPart).polls).toEqual([waiting])
  })

  it("joins a poll inside Cursor's envelope by the job ids it asked for", () => {
    const start = call("image_generate", mcp(RUNNING))
    const waiting = call("image_get_result", null, {
      providerIdentifier: "codeg-mcp",
      toolName: "image_get_result",
      args: { job_ids: ["img-abc"] },
    })
    expect(foldCollectCalls([start, waiting])).toHaveLength(1)
  })

  it("keeps two images apart", () => {
    const first = call("image_generate", mcp(RUNNING), {}, "first")
    const second = call(
      "image_generate",
      mcp(RUNNING.replace(/img-abc/g, "img-def")),
      {},
      "second"
    )
    const poll = call(
      "image_get_result",
      mcp(SAVED.replace("img-abc", "img-def"))
    )
    const folded = foldCollectCalls([first, second, poll])
    expect(folded).toHaveLength(2)
    expect((folded[0] as AdaptedImageJobPart).polls).toEqual([])
    expect((folded[1] as AdaptedImageJobPart).polls).toEqual([poll])
  })

  it("gives a collect whose start is not in view a card of its own", () => {
    const poll = call("image_get_result", mcp(SAVED))
    const [card] = foldCollectCalls([poll]) as AdaptedImageJobPart[]
    expect(card?.type).toBe("image-job")
    expect(card?.call).toBe(poll)
  })

  it("gives a pending question the answer collected later", () => {
    const ask = call("mcp__codeg-mcp__ask_user_question", mcp(PENDING))
    const wait = call("get_question_answer", mcp(PENDING), {
      question_id: "q-1",
    })
    const answer = call(
      "get_question_answer",
      mcp("User answered: A"),
      { question_id: "q-1" },
      "answer"
    )
    const folded = foldCollectCalls([ask, wait, text, answer])
    expect(folded).toHaveLength(2)
    const card = folded[0] as AdaptedToolCallPart
    expect(card.toolCallId).toBe(ask.toolCallId)
    expect(card.output).toBe(answer.output)
    expect(ask.output).toBe(mcp(PENDING))
    expect(folded[1]).toBe(text)
  })

  it("keeps an answer whose question is not in view and drops a wait", () => {
    const wait = call("get_question_answer", mcp(PENDING), {
      question_id: "q-1",
    })
    const gone = call("get_question_answer", mcp(GONE), { question_id: "q-9" })
    const answer = call("get_question_answer", mcp("User answered: B"), {
      question_id: "q-2",
    })
    expect(foldCollectCalls([wait, gone, answer])).toEqual([answer])
  })
})
