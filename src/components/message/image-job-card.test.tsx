import { type ReactElement, type ReactNode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"

import enMessages from "@/i18n/messages/en.json"
import type { AdaptedToolCallPart } from "@/lib/adapters/ai-elements-adapter"
import type { AdaptedImageJobPart } from "@/lib/image-gen/tool-calls"

const getImageJobStatus = vi.fn()
const loadGeneratedImage = vi.fn()
vi.mock("@/lib/image-gen/api", () => ({
  getImageJobStatus: (...args: unknown[]) => getImageJobStatus(...args),
  loadGeneratedImage: (...args: unknown[]) => loadGeneratedImage(...args),
}))
const openFileTarget = vi.fn()
vi.mock("@/hooks/use-open-file-target", () => ({
  useOpenFileTarget: () => openFileTarget,
}))
vi.mock("@/components/message/file-reference-actions", () => ({
  FileReferenceActions: ({ children }: { children: ReactNode }) => children,
}))

import { ImageJobCard } from "./image-job-card"

const card = enMessages.ImageGeneration
const PATH = "/repo/assets/cat.png"
const SAVED = `Image saved to ${PATH} (1024x1024, image/png, gpt-image-1 via OpenAI, 12.3 s). job_id=img-1`
const RUNNING = "Still generating (job_id=img-1, 20.0 s so far)."

function mcp(text: string): string {
  return JSON.stringify({ content: [{ type: "text", text }] })
}

function part(
  output: string | null,
  extra: Partial<AdaptedToolCallPart> = {},
  polls: AdaptedToolCallPart[] = []
): AdaptedImageJobPart {
  return {
    type: "image-job",
    call: {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "mcp__codeg-mcp__image_generate",
      input: JSON.stringify({ prompt: "a tabby cat" }),
      state: output === null ? "input-available" : "output-available",
      output,
      ...extra,
    },
    polls,
  }
}

function renderCard(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  getImageJobStatus.mockReset()
  loadGeneratedImage.mockReset()
  loadGeneratedImage.mockResolvedValue({ data: "QUJD", mime_type: "image/png" })
})

describe("ImageJobCard", () => {
  it("shows a finished image from its file, with where and how it was made", async () => {
    renderCard(<ImageJobCard part={part(mcp(SAVED))} />)

    expect(await screen.findByAltText("cat.png")).toBeInTheDocument()
    expect(loadGeneratedImage).toHaveBeenCalledWith(PATH)
    expect(getImageJobStatus).not.toHaveBeenCalled()
    expect(screen.getByText(PATH)).toBeInTheDocument()
    expect(screen.getByText("OpenAI · gpt-image-1")).toBeInTheDocument()
    expect(screen.getByText("1024×1024")).toBeInTheDocument()
    expect(screen.getByText("took 12 s")).toBeInTheDocument()
    expect(screen.getByText("a tabby cat")).toBeInTheDocument()
  })

  it("shows the time so far while the call itself still runs", () => {
    renderCard(<ImageJobCard part={part(null)} />)
    expect(
      screen.getByText(card.generating.replace("{seconds}", "0"))
    ).toBeInTheDocument()
    expect(getImageJobStatus).not.toHaveBeenCalled()
  })

  it("asks Codeg about a job the transcript still calls running", async () => {
    getImageJobStatus.mockResolvedValue({
      job_id: "img-1",
      status: "completed",
      path: PATH,
      width: 1024,
      height: 1024,
      mime_type: "image/png",
      model: "gpt-image-1",
      service: "OpenAI",
      elapsed_ms: 31000,
    })
    renderCard(<ImageJobCard part={part(mcp(RUNNING))} />)

    expect(await screen.findByAltText("cat.png")).toBeInTheDocument()
    expect(getImageJobStatus).toHaveBeenCalledWith("img-1")
    expect(screen.getByText("took 31 s")).toBeInTheDocument()
  })

  it("takes the result a later image_get_result collected", async () => {
    const poll: AdaptedToolCallPart = {
      type: "tool-call",
      toolCallId: "call-2",
      toolName: "image_get_result",
      input: JSON.stringify({ job_ids: ["img-1"] }),
      state: "output-available",
      output: mcp(SAVED),
    }
    renderCard(<ImageJobCard part={part(mcp(RUNNING), {}, [poll])} />)

    expect(await screen.findByAltText("cat.png")).toBeInTheDocument()
    expect(getImageJobStatus).not.toHaveBeenCalled()
  })

  it("says so when Codeg no longer knows the job", async () => {
    getImageJobStatus.mockResolvedValue({ job_id: "img-1", status: "unknown" })
    renderCard(<ImageJobCard part={part(mcp(RUNNING))} />)
    expect(await screen.findByText(card.statusLost)).toBeInTheDocument()
  })

  it("shows why a job failed", () => {
    renderCard(
      <ImageJobCard
        part={part(
          mcp("Image generation failed (job_id=img-1): 401 Unauthorized")
        )}
      />
    )
    expect(screen.getByText("401 Unauthorized")).toBeInTheDocument()
  })

  it("shows what the tool said when it started no job", () => {
    renderCard(
      <ImageJobCard
        part={part(mcp("Image generation is switched off in Codeg."))}
      />
    )
    expect(
      screen.getByText("Image generation is switched off in Codeg.")
    ).toBeInTheDocument()
  })

  it("says the file is gone when it can't be read", async () => {
    loadGeneratedImage.mockRejectedValue(new Error("not found"))
    renderCard(<ImageJobCard part={part(mcp(SAVED))} />)
    await waitFor(() =>
      expect(screen.getByText(card.fileMissing)).toBeInTheDocument()
    )
    // The path stays, so the user can see where it was meant to be.
    expect(screen.getByText(PATH)).toBeInTheDocument()
  })
})
