import type { TranslationSettings } from "@/lib/api"

/** Language codes the translation feature offers. Mirrors
 *  `src-tauri/src/translation/languages.rs`; every one is supported by all
 *  offered models. Codes match the UI's Intl locales (`zh-CN`, not `zh_cn`). */
export const TRANSLATION_LANGUAGES = [
  "zh-CN",
  "zh-TW",
  "en",
  "ja",
  "ko",
  "es",
  "de",
  "fr",
  "pt",
  "ar",
  "ru",
  "it",
] as const

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number]

export function isTranslationLanguage(
  code: string
): code is TranslationLanguage {
  return (TRANSLATION_LANGUAGES as readonly string[]).includes(code)
}

/** Where replies are translated to: the chosen language, else the UI's. */
export function resolveOutputTarget(
  settings: Pick<TranslationSettings, "output_target"> | null,
  uiLocale: string
): TranslationLanguage {
  const chosen = settings?.output_target
  if (chosen && isTranslationLanguage(chosen)) return chosen
  return isTranslationLanguage(uiLocale) ? uiLocale : "en"
}

/** A language's name in the UI language, e.g. `zh-CN` → "中文（中国）". */
export function languageLabel(code: string, uiLocale: string): string {
  try {
    const names = new Intl.DisplayNames([uiLocale], { type: "language" })
    return names.of(code) ?? code
  } catch {
    return code
  }
}

type Script = "han" | "kana" | "hangul" | "cyrillic" | "arabic" | "latin"

const SCRIPT_PATTERNS: [Script, RegExp][] = [
  ["han", /\p{Script=Han}/u],
  ["kana", /[\p{Script=Hiragana}\p{Script=Katakana}]/u],
  ["hangul", /\p{Script=Hangul}/u],
  ["cyrillic", /\p{Script=Cyrillic}/u],
  ["arabic", /\p{Script=Arabic}/u],
  ["latin", /\p{Script=Latin}/u],
]

function countScripts(
  text: string
): { total: number } & Record<Script, number> {
  const counts = {
    total: 0,
    han: 0,
    kana: 0,
    hangul: 0,
    cyrillic: 0,
    arabic: 0,
    latin: 0,
  }
  for (const char of text) {
    for (const [script, pattern] of SCRIPT_PATTERNS) {
      if (pattern.test(char)) {
        counts[script] += 1
        counts.total += 1
        break
      }
    }
  }
  return counts
}

/** Code, URLs and paths are written in Latin letters whatever the prose is in,
 *  so they are left out of the count. */
function proseOnly(text: string): string {
  return text
    .replace(/(`{1,3})[^`]*?\1/g, " ")
    .replace(/\bhttps?:\/\/\S+/g, " ")
    .replace(/(?:^|\s)[\w.-]*[/\\][\w./\\-]+/g, " ")
}

/** Whether a text needs no translation into `target`, judged by the script
 *  its letters are written in. Text without letters counts as done. Latin
 *  targets other than English cannot be told apart from English this way, so
 *  for them nothing is ever skipped. */
export function isAlreadyInTarget(text: string, target: string): boolean {
  const c = countScripts(proseOnly(text))
  if (c.total === 0) return true
  const share = (n: number) => n / c.total
  if (target.startsWith("zh")) return share(c.han) >= 0.3 && c.kana === 0
  switch (target) {
    case "ja":
      return c.kana > 0 && share(c.kana + c.han) >= 0.3
    case "ko":
      return share(c.hangul) >= 0.3
    case "ru":
      return share(c.cyrillic) >= 0.5
    case "ar":
      return share(c.arabic) >= 0.5
    case "en":
      return share(c.latin) >= 0.9
    default:
      return false
  }
}
