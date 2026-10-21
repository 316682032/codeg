// Names of the codeg-mcp tools that collect a slow result in later calls
// (keh4l build). Kept free of imports so the tool-name normalizer can use
// them without an import cycle.

export const IMAGE_GENERATE_TOOL = "image_generate"
export const IMAGE_GET_RESULT_TOOL = "image_get_result"
export const GET_QUESTION_ANSWER_TOOL = "get_question_answer"

export const COLLECT_TOOL_NAMES: ReadonlySet<string> = new Set([
  IMAGE_GENERATE_TOOL,
  IMAGE_GET_RESULT_TOOL,
  GET_QUESTION_ANSWER_TOOL,
])

const COLLECT_TOOL_SUFFIX_RE =
  /(?:^|[^a-z0-9])(image_generate|image_get_result|get_question_answer)$/

/** The canonical name for any host's spelling of these tools (bare,
 *  `mcp__<server>__<tool>`, `<server>/<tool>`, …), or null. Expects a
 *  lowercased name. */
export function collectToolCanonicalName(name: string): string | null {
  return name.match(COLLECT_TOOL_SUFFIX_RE)?.[1] ?? null
}
