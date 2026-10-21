import { type ReactElement } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"

import enMessages from "@/i18n/messages/en.json"
import type {
  ImageGenSettingsInput,
  ImageGenSettingsView,
} from "@/lib/image-gen/api"

const getImageGenSettings = vi.fn()
const saveImageGenSettings = vi.fn()
const testImageGenService = vi.fn()
vi.mock("@/lib/image-gen/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image-gen/api")>()),
  getImageGenSettings: () => getImageGenSettings(),
  saveImageGenSettings: (input: ImageGenSettingsInput) =>
    saveImageGenSettings(input),
  testImageGenService: (id: string, model: string) =>
    testImageGenService(id, model),
}))
vi.mock("@/lib/platform", () => ({
  subscribe: vi.fn(async () => () => {}),
}))
const toastSuccess = vi.fn()
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: (m: string) => toastSuccess(m) },
}))

import { ImageGenerationSettings } from "./image-generation-settings"

const t = enMessages.ImageGenerationSettings

function view(over: Partial<ImageGenSettingsView> = {}): ImageGenSettingsView {
  return {
    enabled: true,
    services: [],
    default_model: null,
    save_dir: "",
    default_save_dir: "/home/me/.codeg/generated-images",
    send_preview: true,
    ...over,
  }
}

const relay = {
  id: "svc-1",
  name: "",
  kind: "openai" as const,
  base_url: "https://relay.example.com/v1",
  models: ["gpt-image-2"],
  has_key: false,
}

/** What the backend does with a save: mint ids, keep keys to itself. */
function echoSave(previous: () => ImageGenSettingsView) {
  saveImageGenSettings.mockImplementation(
    async (input: ImageGenSettingsInput) => {
      const before = previous()
      return view({
        ...input,
        default_save_dir: before.default_save_dir,
        services: input.services.map(({ api_key, ...service }, i) => ({
          ...service,
          id: service.id || `svc-new-${i}`,
          has_key:
            api_key === undefined
              ? (before.services.find((s) => s.id === service.id)?.has_key ??
                false)
              : api_key !== "",
        })),
      })
    }
  )
}

function renderPage(ui: ReactElement = <ImageGenerationSettings />) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  getImageGenSettings.mockReset()
  saveImageGenSettings.mockReset()
  testImageGenService.mockReset()
  toastSuccess.mockReset()
})

describe("ImageGenerationSettings", () => {
  it("adds a blank service and opens it for its key", async () => {
    const initial = view()
    getImageGenSettings.mockResolvedValue(initial)
    echoSave(() => initial)
    renderPage()

    expect(await screen.findByText(t.services.empty)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: t.services.add }))

    await waitFor(() => expect(saveImageGenSettings).toHaveBeenCalledTimes(1))
    expect(saveImageGenSettings.mock.calls[0]![0].services).toEqual([
      { id: "", name: "", kind: "openai", base_url: "", models: [] },
    ])
    expect(
      await screen.findByLabelText("API key for OpenAI")
    ).toBeInTheDocument()
  })

  it("saves a key with its service and never sends has_key back", async () => {
    const initial = view({ services: [relay] })
    getImageGenSettings.mockResolvedValue(initial)
    echoSave(() => initial)
    renderPage()

    // A service without a key opens by itself.
    const field = await screen.findByLabelText("API key for relay.example.com")
    fireEvent.change(field, { target: { value: " sk-test " } })
    fireEvent.click(screen.getByRole("button", { name: t.key.save }))

    await waitFor(() => expect(saveImageGenSettings).toHaveBeenCalledTimes(1))
    const [sent] = saveImageGenSettings.mock.calls[0]!
    expect(sent.services[0]).toEqual({
      id: "svc-1",
      name: "",
      kind: "openai",
      base_url: "https://relay.example.com/v1",
      models: ["gpt-image-2"],
      api_key: "sk-test",
    })
    expect(await screen.findByText(t.key.saved)).toBeInTheDocument()
    expect(toastSuccess).toHaveBeenCalledWith(t.keySaved)
  })

  it("adds a model on Enter", async () => {
    const initial = view({ services: [relay] })
    getImageGenSettings.mockResolvedValue(initial)
    echoSave(() => initial)
    renderPage()

    const input = await screen.findByLabelText(t.service.addModel)
    fireEvent.change(input, { target: { value: "grok-imagine-image-2.0" } })
    fireEvent.keyDown(input, { key: "Enter" })

    await waitFor(() => expect(saveImageGenSettings).toHaveBeenCalledTimes(1))
    expect(saveImageGenSettings.mock.calls[0]![0].services[0].models).toEqual([
      "gpt-image-2",
      "grok-imagine-image-2.0",
    ])
  })

  it("tests a service with its first model and shows how it went", async () => {
    const keyed = { ...relay, has_key: true }
    getImageGenSettings.mockResolvedValue(view({ services: [keyed] }))
    testImageGenService.mockResolvedValue({
      model: "gpt-image-2",
      elapsed_ms: 8400,
      image: { data: "QUJD", mime_type: "image/png", width: 64, height: 64 },
    })
    renderPage()

    // A keyed service starts closed; open it.
    fireEvent.click(await screen.findByText("relay.example.com"))
    fireEvent.click(screen.getByRole("button", { name: t.test.run }))

    expect(
      await screen.findByText("Works · gpt-image-2 took 8.4 s")
    ).toBeInTheDocument()
    expect(testImageGenService).toHaveBeenCalledWith("svc-1", "gpt-image-2")
  })

  it("removes a service only after the confirmation", async () => {
    const initial = view({ services: [relay] })
    getImageGenSettings.mockResolvedValue(initial)
    echoSave(() => initial)
    renderPage()

    fireEvent.click(
      await screen.findByRole("button", { name: t.service.remove })
    )
    expect(saveImageGenSettings).not.toHaveBeenCalled()
    fireEvent.click(
      await screen.findByRole("button", { name: t.service.removeConfirm })
    )

    await waitFor(() => expect(saveImageGenSettings).toHaveBeenCalledTimes(1))
    expect(saveImageGenSettings.mock.calls[0]![0].services).toEqual([])
  })

  it("keeps both of two edits made before the first save returned", async () => {
    const initial = view({ services: [relay] })
    getImageGenSettings.mockResolvedValue(initial)
    echoSave(() => initial)
    // The first save hangs until released.
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const echo = saveImageGenSettings.getMockImplementation()!
    saveImageGenSettings.mockImplementationOnce(async (input) => {
      await gate
      return echo(input)
    })
    renderPage()

    const name = await screen.findByLabelText(t.service.name)
    fireEvent.change(name, { target: { value: "My relay" } })
    fireEvent.blur(name)
    const url = screen.getByLabelText(t.service.baseUrl)
    // Still editable while the first save is out.
    expect(url).toBeEnabled()
    fireEvent.change(url, { target: { value: "https://other.example.com/v1" } })
    fireEvent.blur(url)
    release()

    await waitFor(() => expect(saveImageGenSettings).toHaveBeenCalledTimes(2))
    const second = saveImageGenSettings.mock.calls[1]![0].services[0]
    expect(second.name).toBe("My relay")
    expect(second.base_url).toBe("https://other.example.com/v1")
  })

  it("turns the tools off with the main switch", async () => {
    const initial = view({ services: [relay] })
    getImageGenSettings.mockResolvedValue(initial)
    echoSave(() => initial)
    renderPage()

    fireEvent.click(await screen.findByRole("switch", { name: t.enable.title }))
    await waitFor(() => expect(saveImageGenSettings).toHaveBeenCalledTimes(1))
    expect(saveImageGenSettings.mock.calls[0]![0].enabled).toBe(false)
  })
})
