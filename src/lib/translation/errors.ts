import { extractAppCommandError } from "@/lib/app-error"

/** i18n keys the backend stamps on translation errors, resolved under the
 *  `Translation` namespace. MUST stay in lockstep with the
 *  `TRANSLATION_I18N_KEY_*` constants in `src-tauri/src/app_error.rs`. */
export const TRANSLATION_ERROR_KEYS = [
  "errors.missingKey",
  "errors.unsupportedLanguage",
  "errors.auth",
  "errors.rateLimited",
  "errors.rejected",
  "errors.network",
  "errors.badResponse",
] as const

type TranslationErrorKey = (typeof TRANSLATION_ERROR_KEYS)[number]

type Translate = (
  key: TranslationErrorKey | "errors.unknown",
  values?: Record<string, string>
) => string

/** A translation error in the user's language, falling back to the backend's
 *  English message for anything without a key. */
export function describeTranslationError(error: unknown, t: Translate): string {
  const appError = extractAppCommandError(error)
  const key = appError?.i18n_key
  if (key && (TRANSLATION_ERROR_KEYS as readonly string[]).includes(key)) {
    const params = { ...(appError?.i18n_params ?? {}) }
    // `message` is a raw engine message; keep the provider name readable.
    if (params.provider === "dashscope") params.provider = "Bailian"
    if (params.provider === "tokenhub") params.provider = "TokenHub"
    return t(key as TranslationErrorKey, {
      model: "",
      message: "",
      language: "",
      provider: "",
      ...params,
    })
  }
  if (appError?.message) return appError.message
  if (error instanceof Error && error.message) return error.message
  return t("errors.unknown")
}
