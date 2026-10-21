// The codeg-mcp tools that start something slow and collect it later (keh4l
// build): `image_generate` / `image_get_result`, and `ask_user_question`'s
// `get_question_answer`. An agent whose tool calls time out quickly gets a
// job or question id back and collects the result in later calls; the chat
// shows one card per job or question, with the later calls folded into it.
//
// Results are read from the text the companion writes
// (`src-tauri/src/acp/delegation/fork_tools.rs`), since that is what every
// host keeps; image results carry no `structuredContent` at all.

import type { AdaptedToolCallPart } from "@/lib/adapters/ai-elements-adapter"
import { normalizeToolName } from "@/lib/tool-call-normalization"

import {
  GET_QUESTION_ANSWER_TOOL,
  IMAGE_GENERATE_TOOL,
  IMAGE_GET_RESULT_TOOL,
} from "./tool-names"

export {
  GET_QUESTION_ANSWER_TOOL,
  IMAGE_GENERATE_TOOL,
  IMAGE_GET_RESULT_TOOL,
} from "./tool-names"

export function isImageJobTool(toolName: string | null | undefined): boolean {
  if (!toolName) return false
  const name = normalizeToolName(toolName)
  return name === IMAGE_GENERATE_TOOL || name === IMAGE_GET_RESULT_TOOL
}

// codex's rollout keeps a result as `Wall time: <n>s\nOutput:\n<body>`.
const CODEX_WRAPPER_RE = /^Wall time:[^\n]*\r?\nOutput:\r?\n([\s\S]*)$/

/** A tool output without codex's rollout wrapper. */
function unwrapOutput(output: string): string {
  return output.match(CODEX_WRAPPER_RE)?.[1] ?? output
}

/** Every text a tool output carries: the plain string, or the `text` of
 *  each content item of an MCP result however a host wrapped it. */
export function outputText(output: string | null | undefined): string {
  if (!output) return ""
  const body = unwrapOutput(output)
  const trimmed = body.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return body
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return body
  }
  const texts: string[] = []
  const walk = (value: unknown, depth: number) => {
    if (depth > 6 || value === null || value === undefined) return
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1)
      return
    }
    if (typeof value !== "object") return
    const obj = value as Record<string, unknown>
    if (obj.type === "text" && typeof obj.text === "string") {
      texts.push(obj.text)
      return
    }
    for (const [key, child] of Object.entries(obj)) {
      if (key === "data") continue
      if (typeof child === "string" && key === "text") texts.push(child)
      else walk(child, depth + 1)
    }
  }
  walk(parsed, 0)
  return texts.length > 0 ? texts.join("\n") : body
}

export type ImageJobStatus = "running" | "completed" | "failed" | "unknown"

export interface ImageJobResult {
  jobId: string
  status: ImageJobStatus
  path?: string
  width?: number
  height?: number
  mimeType?: string
  model?: string
  service?: string
  elapsedMs?: number
  error?: string
  revisedPrompt?: string
}

const SAVED_RE = /^Image saved to (.+) \(([^()]*)\)\. job_id=(\S+)\s*$/
const FAILED_RE = /^Image generation failed \(job_id=(\S+?)\): (.*)$/
const RUNNING_RE =
  /^Still generating \(job_id=([^,)\s]+)(?:, ([\d.]+) s so far)?\)\.?$/
const UNKNOWN_RE = /^Unknown job_id (\S+?):/
const REVISED_RE = /^The service rewrote the prompt as: (.*)$/

function parseDetails(details: string, into: ImageJobResult) {
  for (const raw of details.split(", ")) {
    const part = raw.trim()
    const size = part.match(/^(\d+)x(\d+)$/)
    if (size) {
      into.width = Number(size[1])
      into.height = Number(size[2])
    } else if (/^image\/[\w.+-]+$/.test(part)) {
      into.mimeType = part
    } else if (/^[\d.]+ s$/.test(part)) {
      into.elapsedMs = Math.round(parseFloat(part) * 1000)
    } else if (part) {
      const via = part.match(/^(.+) via (.+)$/)
      if (via) {
        into.model = via[1]
        into.service = via[2]
      } else {
        into.model = part
      }
    }
  }
}

/** The jobs an `image_generate` / `image_get_result` result reports. */
export function parseImageJobOutput(
  output: string | null | undefined
): ImageJobResult[] {
  const jobs: ImageJobResult[] = []
  let last: ImageJobResult | null = null
  for (const line of outputText(output).split(/\r?\n/)) {
    const text = line.trim()
    let m = text.match(SAVED_RE)
    if (m) {
      last = { jobId: m[3], status: "completed", path: m[1] }
      parseDetails(m[2], last)
      jobs.push(last)
      continue
    }
    m = text.match(FAILED_RE)
    if (m) {
      last = { jobId: m[1], status: "failed", error: m[2] }
      jobs.push(last)
      continue
    }
    m = text.match(RUNNING_RE)
    if (m) {
      last = {
        jobId: m[1],
        status: "running",
        elapsedMs: m[2] ? Math.round(parseFloat(m[2]) * 1000) : undefined,
      }
      jobs.push(last)
      continue
    }
    m = text.match(UNKNOWN_RE)
    if (m) {
      last = { jobId: m[1], status: "unknown" }
      jobs.push(last)
      continue
    }
    m = text.match(REVISED_RE)
    if (m && last) last.revisedPrompt = m[1]
  }
  return jobs
}

/** Latest word on each job across several results, in order: a finished
 *  report is never replaced by an older "still running" one. */
export function mergeImageJobResults(
  outputs: Array<string | null | undefined>
): ImageJobResult[] {
  const byId = new Map<string, ImageJobResult>()
  for (const output of outputs) {
    for (const job of parseImageJobOutput(output)) {
      const prev = byId.get(job.jobId)
      const prevDone =
        prev && (prev.status === "completed" || prev.status === "failed")
      if (prevDone && job.status !== "completed" && job.status !== "failed") {
        continue
      }
      byId.set(job.jobId, { ...prev, ...job })
    }
  }
  return [...byId.values()]
}

export interface ImageGenerateInput {
  prompt: string | null
  model: string | null
  outputPath: string | null
}

/** A tool call's arguments from its input JSON, also inside the envelopes
 *  hosts wrap MCP calls in: Antigravity's `{arguments}`, Cursor's
 *  `{providerIdentifier, toolName, args}`. */
function inputArguments(
  input: string | null | undefined
): Record<string, unknown> {
  if (!input) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== "object") return {}
  const record = parsed as Record<string, unknown>
  for (const key of ["arguments", "args"]) {
    const inner = record[key]
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return inner as Record<string, unknown>
    }
  }
  return record
}

export function parseImageGenerateInput(
  input: string | null | undefined
): ImageGenerateInput {
  const obj = inputArguments(input)
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null)
  return {
    prompt: str(obj.prompt),
    model: str(obj.model),
    outputPath: str(obj.output_path),
  }
}

/** `question_id` of a pending `ask_user_question` / `get_question_answer`
 *  result, or null when the result is an answer (or nothing yet). */
export function pendingQuestionId(
  output: string | null | undefined
): string | null {
  if (!output) return null
  const text = outputText(output)
  const m = text.match(/has not answered yet[\s\S]*?question_id "([^"]+)"/)
  if (m) return m[1]
  try {
    const parsed = JSON.parse(unwrapOutput(output)) as Record<string, unknown>
    const sc = (parsed.structuredContent ?? parsed) as Record<string, unknown>
    if (sc?.pending === true && typeof sc.question_id === "string") {
      return sc.question_id
    }
  } catch {
    // Not JSON; the text check above is the answer.
  }
  return null
}

/** Whether a `get_question_answer` result says the question is gone. */
export function isGoneQuestionOutput(
  output: string | null | undefined
): boolean {
  return /no longer waiting for an answer/.test(outputText(output))
}

function callArguments(part: AdaptedToolCallPart): Record<string, unknown> {
  return inputArguments(part.input)
}

function questionIdOfCollect(part: AdaptedToolCallPart): string | null {
  const id = callArguments(part).question_id
  return typeof id === "string" ? id : null
}

/** The jobs an `image_get_result` call is about: what it asked for (known
 *  while it still waits), then what it reported. */
function jobIdsOfCollect(part: AdaptedToolCallPart): string[] {
  const asked = callArguments(part).job_ids
  const ids =
    typeof asked === "string"
      ? [asked]
      : Array.isArray(asked)
        ? asked.filter((id): id is string => typeof id === "string")
        : []
  return [...ids, ...parseImageJobOutput(part.output).map((j) => j.jobId)]
}

/** One image job's card: the call that started it and the later calls that
 *  collected it. A collect call whose start is not in view stands alone
 *  (`call` is then that collect call). */
export type AdaptedImageJobPart = {
  type: "image-job"
  call: AdaptedToolCallPart
  polls: AdaptedToolCallPart[]
}

type FoldablePart = { type: string } & Record<string, unknown>

function asToolCall(part: FoldablePart): AdaptedToolCallPart | null {
  return part.type === "tool-call"
    ? (part as unknown as AdaptedToolCallPart)
    : null
}

/**
 * Fold the collect calls into the card of what they collect:
 *
 * - `image_generate` (and a stray `image_get_result`) becomes an
 *   `image-job` part; each later `image_get_result` naming its job joins it.
 * - A pending `ask_user_question` takes the answer a later
 *   `get_question_answer` collected; collect calls that found nothing new
 *   are dropped once their question is in view.
 *
 * Pure: returns new arrays and part objects, never mutates its input. Run per
 * turn and again over merged sub-turns, since the collect calls usually land
 * in later sub-turns: there a card a turn made for a collect call whose start
 * was out of view joins the start's card.
 */
export function foldCollectCalls<T extends FoldablePart>(
  parts: T[]
): Array<T | AdaptedImageJobPart> {
  const out: Array<T | AdaptedImageJobPart> = []
  const jobCards = new Map<string, number>()
  const questionCards = new Map<string, number>()

  const registerJobs = (
    index: number,
    call: AdaptedToolCallPart,
    polls: AdaptedToolCallPart[]
  ) => {
    for (const job of mergeImageJobResults([
      call.output,
      ...polls.map((p) => p.output),
    ])) {
      if (!jobCards.has(job.jobId)) jobCards.set(job.jobId, index)
    }
  }

  const cardOf = (collects: AdaptedToolCallPart[]): number | undefined =>
    collects
      .flatMap(jobIdsOfCollect)
      .map((id) => jobCards.get(id))
      .find((i): i is number => i !== undefined)
  const addCard = (call: AdaptedToolCallPart, polls: AdaptedToolCallPart[]) => {
    const index = out.length
    out.push({ type: "image-job", call, polls })
    registerJobs(index, call, polls)
  }
  const addPolls = (index: number, polls: AdaptedToolCallPart[]) => {
    const card = out[index] as AdaptedImageJobPart
    out[index] = { ...card, polls: [...card.polls, ...polls] }
    registerJobs(index, card.call, [...card.polls, ...polls])
  }

  for (const part of parts) {
    if (part.type === "image-job") {
      const job = part as unknown as AdaptedImageJobPart
      const collects = [job.call, ...job.polls]
      const standalone =
        normalizeToolName(job.call.toolName) === IMAGE_GET_RESULT_TOOL
      const target = standalone ? cardOf(collects) : undefined
      if (target !== undefined) addPolls(target, collects)
      else addCard(job.call, job.polls)
      continue
    }
    const call = asToolCall(part)
    const name = call ? normalizeToolName(call.toolName) : null
    if (call && name === IMAGE_GENERATE_TOOL) {
      addCard(call, [])
      continue
    }
    if (call && name === IMAGE_GET_RESULT_TOOL) {
      const target = cardOf([call])
      if (target !== undefined) addPolls(target, [call])
      // Its start is not in view (yet): a card of its own, so nothing is lost.
      else addCard(call, [])
      continue
    }
    if (call && name === "question") {
      const id = pendingQuestionId(call.output)
      if (id) questionCards.set(id, out.length)
      out.push(part)
      continue
    }
    if (call && name === GET_QUESTION_ANSWER_TOOL) {
      const id = questionIdOfCollect(call) ?? pendingQuestionId(call.output)
      const target = id ? questionCards.get(id) : undefined
      const answered =
        !!call.output &&
        !pendingQuestionId(call.output) &&
        !isGoneQuestionOutput(call.output) &&
        call.state === "output-available"
      if (target !== undefined) {
        if (answered) {
          const ask = out[target] as unknown as AdaptedToolCallPart
          out[target] = { ...ask, output: call.output } as unknown as T
          questionCards.delete(id!)
        }
        continue
      }
      // Its question is not in view: keep an answer, drop a wait.
      if (answered) out.push(part)
      continue
    }
    out.push(part)
  }
  return out
}
