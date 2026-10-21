"use client"

/**
 * One image made with Codeg's image tools (keh4l build): the `image_generate`
 * call and every `image_get_result` that collected it, as one card.
 *
 * What the transcript says comes first; while it still says "generating",
 * the card asks Codeg about the job itself (`image_gen_job_status`), so the
 * image shows up the moment it is saved rather than when the agent next
 * checks. The image is read from the saved file, so the card works the same
 * after a reload, for as long as the file is there.
 */

import { useEffect, useMemo, useState } from "react"
import { FileImage } from "lucide-react"
import { useTranslations } from "next-intl"

import { FileReferenceActions } from "@/components/message/file-reference-actions"
import { GeneratedImagesBlock } from "@/components/message/generated-images-block"
import type { UserImageDisplay } from "@/lib/adapters/ai-elements-adapter"
import {
  getImageJobStatus,
  loadGeneratedImage,
  type ImageJobView,
} from "@/lib/image-gen/api"
import {
  IMAGE_GET_RESULT_TOOL,
  mergeImageJobResults,
  outputText,
  parseImageGenerateInput,
  type AdaptedImageJobPart,
  type ImageJobResult,
} from "@/lib/image-gen/tool-calls"
import { normalizeToolName } from "@/lib/tool-call-normalization"
import { useOpenFileTarget } from "@/hooks/use-open-file-target"

/** How often a running job is asked about. */
const POLL_MS = 2000

function fromView(view: ImageJobView): ImageJobResult {
  return {
    jobId: view.job_id,
    status: view.status,
    path: view.path,
    width: view.width,
    height: view.height,
    mimeType: view.mime_type,
    model: view.model,
    service: view.service,
    elapsedMs: view.elapsed_ms,
    error: view.error,
    revisedPrompt: view.revised_prompt,
  }
}

function isDone(job: ImageJobResult | null | undefined): boolean {
  return job?.status === "completed" || job?.status === "failed"
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

export function ImageJobCard({ part }: { part: AdaptedImageJobPart }) {
  const t = useTranslations("ImageGeneration")
  const openFileTarget = useOpenFileTarget()
  const { call, polls } = part
  const collectOnly = normalizeToolName(call.toolName) === IMAGE_GET_RESULT_TOOL
  const input = useMemo(
    () => (collectOnly ? null : parseImageGenerateInput(call.input)),
    [call.input, collectOnly]
  )
  const reported = useMemo(
    () => mergeImageJobResults([call.output, ...polls.map((p) => p.output)]),
    [call.output, polls]
  )
  const transcriptJob = reported[0] ?? null
  const callRunning =
    call.state === "input-streaming" || call.state === "input-available"
  // Finished without naming a job: what it said is why (switched off, no
  // usable service, a bad output path…), whether or not the host marked the
  // result an error.
  const toolError =
    !transcriptJob && !callRunning
      ? call.errorText?.trim() || outputText(call.output).trim() || null
      : null

  // Codeg's own word on a job the transcript still calls running.
  const [live, setLive] = useState<ImageJobResult | null>(null)
  const jobId = transcriptJob?.jobId ?? null
  const transcriptRunning = transcriptJob?.status === "running"
  useEffect(() => {
    if (!jobId || !transcriptRunning) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      try {
        const view = await getImageJobStatus(jobId)
        if (stopped) return
        const next = fromView(view)
        setLive(next)
        if (next.status !== "running") return
      } catch {
        // Not reachable right now; the transcript still has the last word.
      }
      if (!stopped) timer = setTimeout(() => void tick(), POLL_MS)
    }
    void tick()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [jobId, transcriptRunning])

  const job: ImageJobResult | null = isDone(transcriptJob)
    ? transcriptJob
    : live && live.status !== "unknown"
      ? live
      : transcriptJob
  const lost = !isDone(transcriptJob) && live?.status === "unknown"
  const running =
    !toolError && !lost && (!job ? callRunning : job.status === "running")

  // Seconds so far, while it runs.
  const [startedAt] = useState(() => Date.now() - (job?.elapsedMs ?? 0))
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])
  const elapsedSeconds = Math.max(0, Math.round((now - startedAt) / 1000))

  // The image itself, from the saved file.
  const path = job?.status === "completed" ? (job.path ?? null) : null
  const [file, setFile] = useState<{
    path: string
    image: UserImageDisplay | null
  } | null>(null)
  useEffect(() => {
    if (!path) return
    let cancelled = false
    loadGeneratedImage(path)
      .then((loaded) => {
        if (cancelled) return
        setFile({
          path,
          image: {
            name: fileName(path),
            data: loaded.data,
            mime_type: loaded.mime_type,
            uri: path,
          },
        })
      })
      .catch(() => {
        if (!cancelled) setFile({ path, image: null })
      })
    return () => {
      cancelled = true
    }
  }, [path])
  const fileLoaded = !!path && file?.path === path
  const image = fileLoaded ? file.image : null
  const imageError = fileLoaded && !file.image

  const failed = !!toolError || job?.status === "failed" || imageError || lost
  const failedText = toolError
    ? toolError
    : job?.status === "failed"
      ? job.error || null
      : imageError
        ? t("fileMissing")
        : lost
          ? t("statusLost")
          : null

  const details: string[] = []
  if (job?.model) {
    details.push(job.service ? `${job.service} · ${job.model}` : job.model)
  } else if (input?.model) {
    details.push(input.model)
  }
  if (job?.width && job?.height) details.push(`${job.width}×${job.height}`)
  if (job?.status === "completed" && job.elapsedMs) {
    details.push(t("took", { seconds: Math.round(job.elapsedMs / 1000) }))
  }

  const footer =
    path || details.length > 0 ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {path ? (
          <FileReferenceActions target={path}>
            <button
              type="button"
              className="inline-flex max-w-full items-center gap-1 font-mono underline-offset-2 hover:text-foreground hover:underline"
              title={path}
              onClick={() => void openFileTarget(path)}
            >
              <FileImage className="size-3.5 shrink-0" />
              <span className="truncate">{path}</span>
            </button>
          </FileReferenceActions>
        ) : null}
        {details.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    ) : null

  const prompt = job?.revisedPrompt || input?.prompt || null

  return (
    <GeneratedImagesBlock
      className="mb-2"
      revisedPrompt={prompt}
      image={failed ? null : image}
      status={
        failed
          ? "failed"
          : running || (path && !image)
            ? "in_progress"
            : "completed"
      }
      pendingText={
        running ? t("generating", { seconds: elapsedSeconds }) : t("loading")
      }
      failedText={failedText}
      footer={footer}
    />
  )
}
