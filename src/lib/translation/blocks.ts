import { parseMarkdownIntoBlocks } from "streamdown"

/**
 * Splitting a reply into the units it is translated in, and protecting what
 * must not be translated.
 *
 * The split is Streamdown's own (`marked` tokens), the same one its streaming
 * mode renders block by block, so a translated block lines up with a rendered
 * one. Joining the pieces gives back the original text exactly; if a future
 * Streamdown ever broke that, the whole text is kept as a single block rather
 * than risk losing any of it.
 */

export type BlockKind = "space" | "code" | "prose"

export interface MarkdownBlock {
  raw: string
  kind: BlockKind
  /** `raw` = `lead` + `body` + `trail`; only `body` is translated. */
  lead: string
  body: string
  trail: string
}

export function splitBlocks(markdown: string): MarkdownBlock[] {
  if (!markdown) return []
  const raws = parseMarkdownIntoBlocks(markdown)
  const pieces = raws.join("") === markdown ? raws : [markdown]
  return pieces.map(toBlock)
}

function toBlock(raw: string): MarkdownBlock {
  const body = raw.trim()
  if (!body) return { raw, kind: "space", lead: raw, body: "", trail: "" }
  const start = raw.indexOf(body)
  return {
    raw,
    kind: isUntranslatable(raw, body) ? "code" : "prose",
    lead: raw.slice(0, start),
    body,
    trail: raw.slice(start + body.length),
  }
}

/** Blocks that carry nothing to translate, or that translation would break. */
function isUntranslatable(raw: string, body: string): boolean {
  // A fenced code block (a ```spec json-render card included).
  if (/^(`{3,}|~{3,})/.test(body)) return true
  // Indented code: every non-blank line indented by four spaces or a tab.
  const lines = raw.split("\n").filter((line) => line.trim().length > 0)
  if (lines.length > 0 && lines.every((line) => /^( {4}|\t)/.test(line))) {
    return true
  }
  // Display math, raw HTML, a thematic break.
  if (body.startsWith("$$")) return true
  if (/^<[a-zA-Z!/]/.test(body)) return true
  if (/^([-*_])(\s*\1){2,}$/.test(body)) return true
  // Nothing but numbers, symbols and emoji.
  return !/\p{L}/u.test(body)
}

export interface MaskedText {
  /** What goes to the engine. */
  text: string
  /** Put the protected pieces back into a translation of `text`. */
  restore: (translated: string) => string
}

const PLACEHOLDER = /⟦([A-Z])(\d+)⟧/g

/**
 * Replace the parts of a prose block that must come back byte for byte with
 * placeholders the engines keep (`⟦C0⟧`, tested 2026-10-15): fenced code nested
 * in the block (a list item's snippet), link and image targets, bare URLs.
 * Inline code stays: every engine kept it, and the backend rejects a
 * translation that changed a code span.
 */
export function maskForTranslation(body: string): MaskedText {
  const saved: string[] = []
  const hold = (kind: "C" | "U", original: string) => {
    saved.push(original)
    return `⟦${kind}${saved.length - 1}⟧`
  }

  const withoutFences = maskNestedFences(body, (fence) => hold("C", fence))
  // URLs are masked only outside inline code, which is kept verbatim anyway.
  const text = withoutFences
    .split(/(`+[^`]*`+)/)
    .map((piece, i) => {
      if (i % 2 === 1) return piece
      return piece
        .replace(/\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (_m, url, title) => {
          return `](${hold("U", url)}${title})`
        })
        .replace(/<(https?:\/\/[^>\s]+)>/g, (_m, url) => `<${hold("U", url)}>`)
        .replace(/(^|[\s(])(https?:\/\/[^\s)<>]+)/g, (_m, before, url) => {
          // Sentence punctuation after a URL is prose: it gets translated
          // (a Chinese comma, say), so it stays outside the placeholder.
          const [, link, punctuation] = /^(.*?)([.,;:!?'"]*)$/.exec(url) ?? [
            "",
            url,
            "",
          ]
          return `${before}${hold("U", link)}${punctuation}`
        })
    })
    .join("")

  return {
    text,
    restore: (translated) =>
      translated.replace(PLACEHOLDER, (match, _kind, index) => {
        const original = saved[Number(index)]
        return original ?? match
      }),
  }
}

/** Replace each fenced block inside `body` (indent kept) with `hold(fence)`.
 *  An unclosed fence runs to the end, as Markdown reads it. */
function maskNestedFences(
  body: string,
  hold: (fence: string) => string
): string {
  const lines = body.split("\n")
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const open = lines[i].match(/^(\s*)(`{3,}|~{3,})/)
    if (!open) {
      out.push(lines[i])
      i += 1
      continue
    }
    const [, indent, fence] = open
    const closer = new RegExp(
      `^\\s*${fence[0] === "`" ? "`" : "~"}{${fence.length},}\\s*$`
    )
    let end = i + 1
    while (end < lines.length && !closer.test(lines[end])) end += 1
    const last = Math.min(end, lines.length - 1)
    const fenced = lines
      .slice(i, last + 1)
      .map((line, k) => (k === 0 ? line.slice(indent.length) : line))
      .join("\n")
    out.push(indent + hold(fenced))
    i = last + 1
  }
  return out.join("\n")
}
