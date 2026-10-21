// Image generation (keh4l build): the settings record, the settings page's
// test, and what the chat card asks about a job. Mirrors
// `src-tauri/src/commands/image_gen.rs`.

import { getTransport } from "@/lib/transport"

/** Broadcast with the saved view after every save. Mirrors the Rust
 *  `IMAGE_GEN_SETTINGS_CHANGED_EVENT`. */
export const IMAGE_GEN_SETTINGS_CHANGED_EVENT = "image-gen-settings://changed"

/** Which API a service speaks. Mirror of Rust `ServiceKind`. */
export type ImageServiceKind = "openai" | "gemini"

export const OFFICIAL_BASE_URL: Record<ImageServiceKind, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
}

/** Mirror of Rust `ImageService`. */
export interface ImageService {
  id: string
  /** Empty shows the address's host. */
  name: string
  kind: ImageServiceKind
  /** Empty: the official address for `kind`. */
  base_url: string
  models: string[]
}

/** Mirror of Rust `ModelRef`. */
export interface ImageModelRef {
  service_id: string
  model: string
}

/** Mirror of Rust `ImageServiceView`: the service plus whether a key is
 *  stored. Keys never reach the frontend. */
export interface ImageServiceView extends ImageService {
  has_key: boolean
}

/** Mirror of Rust `ImageGenSettingsView`. */
export interface ImageGenSettingsView {
  enabled: boolean
  services: ImageServiceView[]
  default_model: ImageModelRef | null
  save_dir: string
  /** Where images go while `save_dir` is empty. */
  default_save_dir: string
  send_preview: boolean
}

/** Mirror of Rust `ImageServiceInput`. `api_key`: `undefined` keeps the
 *  stored key, `""` removes it, anything else replaces it. */
export interface ImageServiceInput extends ImageService {
  api_key?: string
}

/** Mirror of Rust `ImageGenSettingsInput`. */
export interface ImageGenSettingsInput {
  enabled: boolean
  services: ImageServiceInput[]
  default_model: ImageModelRef | null
  save_dir: string
  send_preview: boolean
}

/** Mirror of Rust `EncodedImage`. */
export interface EncodedImage {
  data: string
  mime_type: string
  width: number
  height: number
}

/** Mirror of Rust `ImageGenTestResult`. */
export interface ImageGenTestResult {
  model: string
  elapsed_ms: number
  image: EncodedImage
}

/** Mirror of Rust `JobView`. */
export interface ImageJobView {
  job_id: string
  status: "running" | "completed" | "failed" | "unknown"
  elapsed_ms: number
  started_at_ms?: number
  prompt?: string
  model?: string
  service?: string
  path?: string
  width?: number
  height?: number
  mime_type?: string
  revised_prompt?: string
  note?: string
  error?: string
}

export async function getImageGenSettings(): Promise<ImageGenSettingsView> {
  return getTransport().call("get_image_gen_settings")
}

export async function saveImageGenSettings(
  settings: ImageGenSettingsInput
): Promise<ImageGenSettingsView> {
  return getTransport().call("save_image_gen_settings", { settings })
}

export async function testImageGenService(
  serviceId: string,
  model: string
): Promise<ImageGenTestResult> {
  return getTransport().call("test_image_gen_service", { serviceId, model })
}

export async function getImageJobStatus(jobId: string): Promise<ImageJobView> {
  return getTransport().call("image_gen_job_status", { jobId })
}

export async function loadGeneratedImage(path: string): Promise<EncodedImage> {
  return getTransport().call("image_gen_load_image", { path })
}

/** The service's name, or what stands in for one (the address's host). */
export function serviceDisplayName(service: ImageService): string {
  if (service.name.trim()) return service.name.trim()
  if (!service.base_url.trim()) {
    return service.kind === "gemini" ? "Google Gemini" : "OpenAI"
  }
  try {
    return new URL(service.base_url).host
  } catch {
    return service.base_url
  }
}
