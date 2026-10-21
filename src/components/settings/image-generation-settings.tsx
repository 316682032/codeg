"use client"

/**
 * Settings → Image generation (keh4l build).
 *
 * The services agents may generate images with, then how generation behaves.
 * A service is an API type (the OpenAI images API, which Grok and most relays
 * also speak, or Gemini's), an address (empty for the official one), a key and
 * the model names to offer; each row opens onto those and a test. Every change
 * saves at once, like Settings → Translation.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Plus,
  Server,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { SettingCard, SettingRow } from "@/components/shared/setting-card"
import { SettingsSection } from "@/components/shared/settings-section"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toErrorMessage } from "@/lib/app-error"
import {
  getImageGenSettings,
  IMAGE_GEN_SETTINGS_CHANGED_EVENT,
  OFFICIAL_BASE_URL,
  saveImageGenSettings,
  serviceDisplayName,
  testImageGenService,
  type ImageGenSettingsInput,
  type ImageGenSettingsView,
  type ImageGenTestResult,
  type ImageServiceInput,
  type ImageServiceKind,
  type ImageServiceView,
} from "@/lib/image-gen/api"
import { subscribe } from "@/lib/platform"
import { cn } from "@/lib/utils"

/** Model names offered as one-click additions, by API type. Suggestions
 *  only: any name the service (or relay) knows can be typed in. */
const SUGGESTED_MODELS: Record<ImageServiceKind, string[]> = {
  openai: ["gpt-image-2", "gpt-image-2.5-flare", "grok-imagine-image-2.0"],
  gemini: ["gemini-3-pro-image", "gemini-2.5-flash-image"],
}

/** Value of the default-model select meaning "no explicit default". */
const AUTO_DEFAULT = "__auto__"

type TestOutcome = ImageGenTestResult | { error: string }

function toInput(view: ImageGenSettingsView): ImageGenSettingsInput {
  return {
    enabled: view.enabled,
    services: view.services.map((item) => {
      const service: ImageServiceInput = { ...item }
      delete (service as Partial<ImageServiceView>).has_key
      return service
    }),
    default_model: view.default_model,
    save_dir: view.save_dir,
    send_preview: view.send_preview,
  }
}

/**
 * "Set up services", from the image row of Collaboration → In-conversation
 * tools. A full navigation, as the settings shell does on Windows: the
 * section also renders where no Next router is mounted.
 */
export function ConfigureImageServicesLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="text-foreground underline underline-offset-2"
      onClick={() =>
        window.location.assign(
          `/settings/image-generation${window.location.search}`
        )
      }
    >
      {label}
    </button>
  )
}

function modelValue(serviceId: string, model: string): string {
  return JSON.stringify([serviceId, model])
}

export function ImageGenerationSettings() {
  const t = useTranslations("ImageGenerationSettings")
  const [view, setView] = useState<ImageGenSettingsView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestOutcome>>(
    {}
  )
  // The latest record, for the next save to start from: set as soon as a
  // save (or a broadcast) returns one, ahead of the render.
  const viewRef = useRef(view)
  const adopt = useCallback((next: ImageGenSettingsView) => {
    viewRef.current = next
    setView(next)
  }, [])
  // Saves run one after another: each sends the whole record, so one that
  // started before the previous returned would write its change back.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  const pendingRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    getImageGenSettings()
      .then((loaded) => {
        if (cancelled) return
        adopt(loaded)
        // Open what needs doing: a service without a key.
        const first = loaded.services.find((s) => !s.has_key)
        if (first) setExpanded({ [first.id]: true })
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(toErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [adopt])

  // Another window (or the status-bar switch) saved: take its view.
  useEffect(() => {
    let disposed = false
    let unsubscribe: (() => void) | undefined
    void subscribe<ImageGenSettingsView>(
      IMAGE_GEN_SETTINGS_CHANGED_EVENT,
      (remote) => adopt(remote)
    )
      .then((fn) => {
        if (disposed) fn()
        else unsubscribe = fn
      })
      .catch(() => {})
    return () => {
      disposed = true
      unsubscribe?.()
    }
  }, [adopt])

  /** Save the whole record with `change` applied to the latest one.
   *  `services` replaces the list (keys ride on their entries). */
  const save = useCallback(
    (
      change: (input: ImageGenSettingsInput) => ImageGenSettingsInput
    ): Promise<ImageGenSettingsView | null> => {
      pendingRef.current += 1
      setSaving(true)
      const run = queueRef.current.then(async () => {
        const current = viewRef.current
        if (!current) return null
        try {
          const saved = await saveImageGenSettings(change(toInput(current)))
          adopt(saved)
          return saved
        } catch (err) {
          toast.error(t("saveFailed", { message: toErrorMessage(err) }))
          return null
        } finally {
          pendingRef.current -= 1
          if (pendingRef.current === 0) setSaving(false)
        }
      })
      queueRef.current = run
      return run
    },
    [adopt, t]
  )

  const updateService = useCallback(
    (id: string, patch: Partial<ImageServiceInput>) =>
      save((input) => ({
        ...input,
        services: input.services.map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
      })),
    [save]
  )

  const addService = useCallback(async () => {
    const saved = await save((input) => ({
      ...input,
      services: [
        ...input.services,
        { id: "", name: "", kind: "openai", base_url: "", models: [] },
      ],
    }))
    const added = saved?.services[saved.services.length - 1]
    if (added) setExpanded({ [added.id]: true })
  }, [save])

  const removeService = useCallback(
    (id: string) =>
      save((input) => ({
        ...input,
        services: input.services.filter((s) => s.id !== id),
      })),
    [save]
  )

  const saveKey = useCallback(
    async (id: string, value: string): Promise<boolean> => {
      const saved = await updateService(id, { api_key: value })
      if (saved) {
        setTestResults((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        toast.success(value ? t("keySaved") : t("keyRemoved"))
      }
      return saved !== null
    },
    [t, updateService]
  )

  const runTest = useCallback(async (service: ImageServiceView) => {
    const model = service.models[0]
    if (!model) return
    setTesting(service.id)
    try {
      const result = await testImageGenService(service.id, model)
      setTestResults((r) => ({ ...r, [service.id]: result }))
    } catch (err) {
      setTestResults((r) => ({
        ...r,
        [service.id]: { error: toErrorMessage(err) },
      }))
    } finally {
      setTesting(null)
    }
  }, [])

  if (!view) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        {loadError ? (
          t("loadFailed", { message: loadError })
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </>
        )}
      </div>
    )
  }

  const usableModels = view.services.flatMap((service) =>
    service.models.map((model) => ({ service, model }))
  )
  const defaultValue = view.default_model
    ? modelValue(view.default_model.service_id, view.default_model.model)
    : AUTO_DEFAULT

  return (
    <ScrollArea className="h-full">
      <div className="w-full space-y-4 p-3 md:p-4">
        <section className="space-y-1">
          <h1 className="text-sm font-semibold">{t("title")}</h1>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </section>

        <SettingCard>
          <SettingRow
            title={t("enable.title")}
            description={t("enable.description")}
            htmlFor="image-gen-enabled"
            control={
              <Switch
                id="image-gen-enabled"
                checked={view.enabled}
                disabled={saving}
                onCheckedChange={(enabled) =>
                  void save((input) => ({ ...input, enabled }))
                }
              />
            }
          />
        </SettingCard>

        <SettingsSection
          icon={Server}
          title={t("services.title")}
          description={t("services.description")}
          control={
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => void addService()}
            >
              <Plus />
              {t("services.add")}
            </Button>
          }
        >
          <SettingCard>
            {view.services.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                {t("services.empty")}
              </p>
            ) : (
              view.services.map((service) => (
                <ServiceItem
                  key={service.id}
                  service={service}
                  saving={saving}
                  expanded={expanded[service.id] ?? false}
                  onExpandedChange={(open) =>
                    setExpanded((e) => ({ ...e, [service.id]: open }))
                  }
                  testing={testing === service.id}
                  testBusy={testing !== null}
                  result={testResults[service.id]}
                  onTest={() => void runTest(service)}
                  onSaveKey={(value) => saveKey(service.id, value)}
                  onUpdate={(patch) => void updateService(service.id, patch)}
                  onRemove={() => void removeService(service.id)}
                />
              ))
            )}
          </SettingCard>
        </SettingsSection>

        <SettingsSection icon={WandSparkles} title={t("generation.title")}>
          <SettingCard>
            <SettingRow
              title={t("generation.defaultModel")}
              description={t("generation.defaultModelHint")}
              htmlFor="image-gen-default-model"
              control={
                <Select
                  value={defaultValue}
                  disabled={saving || usableModels.length === 0}
                  onValueChange={(value) =>
                    void save((input) => {
                      if (value === AUTO_DEFAULT) {
                        return { ...input, default_model: null }
                      }
                      const [service_id, model] = JSON.parse(value) as [
                        string,
                        string,
                      ]
                      return { ...input, default_model: { service_id, model } }
                    })
                  }
                >
                  <SelectTrigger id="image-gen-default-model" className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO_DEFAULT}>
                      {t("generation.defaultModelAuto")}
                    </SelectItem>
                    {usableModels.map(({ service, model }) => (
                      <SelectItem
                        key={modelValue(service.id, model)}
                        value={modelValue(service.id, model)}
                      >
                        {serviceDisplayName(service)} / {model}
                        {service.has_key ? "" : ` ${t("generation.noKey")}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <SettingRow
              title={t("generation.saveDir")}
              description={t("generation.saveDirHint")}
              htmlFor="image-gen-save-dir"
            >
              <Input
                id="image-gen-save-dir"
                key={view.save_dir}
                className="h-8 font-mono text-xs"
                defaultValue={view.save_dir}
                placeholder={view.default_save_dir}
                onBlur={(e) => {
                  const next = e.target.value.trim()
                  if (next === view.save_dir) return
                  void save((input) => ({ ...input, save_dir: next }))
                }}
              />
            </SettingRow>
            <SettingRow
              title={t("generation.sendPreview")}
              description={t("generation.sendPreviewHint")}
              htmlFor="image-gen-send-preview"
              control={
                <Switch
                  id="image-gen-send-preview"
                  checked={view.send_preview}
                  disabled={saving}
                  onCheckedChange={(send_preview) =>
                    void save((input) => ({ ...input, send_preview }))
                  }
                />
              }
            />
          </SettingCard>
        </SettingsSection>
      </div>
    </ScrollArea>
  )
}

function ServiceItem({
  service,
  saving,
  expanded,
  onExpandedChange,
  testing,
  testBusy,
  result,
  onTest,
  onSaveKey,
  onUpdate,
  onRemove,
}: {
  service: ImageServiceView
  saving: boolean
  expanded: boolean
  onExpandedChange: (open: boolean) => void
  testing: boolean
  testBusy: boolean
  result: TestOutcome | undefined
  onTest: () => void
  onSaveKey: (value: string) => Promise<boolean>
  onUpdate: (patch: Partial<ImageServiceInput>) => void
  onRemove: () => void
}) {
  const t = useTranslations("ImageGenerationSettings")
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [modelDraft, setModelDraft] = useState("")
  const name = serviceDisplayName(service)
  const address = service.base_url
    ? (() => {
        try {
          return new URL(service.base_url).host
        } catch {
          return service.base_url
        }
      })()
    : t("service.official")
  const suggestions = SUGGESTED_MODELS[service.kind].filter(
    (m) => !service.models.includes(m)
  )

  const addModel = (raw: string) => {
    const model = raw.trim()
    if (!model || service.models.includes(model)) return
    onUpdate({ models: [...service.models, model] })
    setModelDraft("")
  }

  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange}>
      <CollapsibleTrigger className="group flex w-full min-w-0 items-center gap-3 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
          {service.kind === "gemini" ? (
            <Sparkles className="size-4 text-muted-foreground" />
          ) : (
            <ImageIcon className="size-4 text-muted-foreground" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t(service.kind === "gemini" ? "kind.gemini" : "kind.openai")} ·{" "}
            {address} ·{" "}
            {t("service.modelCount", { count: service.models.length })}
          </span>
        </span>
        {service.has_key ? (
          <Badge variant="outline">
            <CheckCircle2 className="text-emerald-500" />
            {t("service.configured")}
          </Badge>
        ) : (
          <Badge variant="destructive">
            <CircleAlert />
            {t("service.needsKey")}
          </Badge>
        )}
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-11 mr-3 mb-3">
        <SettingCard>
          <SettingRow
            title={t("service.name")}
            htmlFor={`image-service-name-${service.id}`}
          >
            <Input
              id={`image-service-name-${service.id}`}
              key={service.name}
              className="h-8"
              defaultValue={service.name}
              placeholder={serviceDisplayName({ ...service, name: "" })}
              onBlur={(e) => {
                const next = e.target.value.trim()
                if (next !== service.name) onUpdate({ name: next })
              }}
            />
          </SettingRow>
          <SettingRow
            title={t("service.kind")}
            description={t("service.kindHint")}
            control={
              <div
                role="radiogroup"
                aria-label={t("service.kind")}
                className="inline-flex rounded-full bg-muted p-0.5"
              >
                {(["openai", "gemini"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={service.kind === kind}
                    disabled={saving}
                    onClick={() => {
                      if (service.kind !== kind) onUpdate({ kind })
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs text-muted-foreground transition-colors",
                      service.kind === kind &&
                        "bg-background text-foreground shadow-sm"
                    )}
                  >
                    {t(kind === "gemini" ? "kind.gemini" : "kind.openai")}
                  </button>
                ))}
              </div>
            }
          />
          <SettingRow
            title={t("service.baseUrl")}
            description={t(
              service.kind === "gemini"
                ? "service.baseUrlHintGemini"
                : "service.baseUrlHintOpenai"
            )}
            htmlFor={`image-service-url-${service.id}`}
          >
            <Input
              id={`image-service-url-${service.id}`}
              key={service.base_url}
              className="h-8 font-mono text-xs"
              defaultValue={service.base_url}
              placeholder={OFFICIAL_BASE_URL[service.kind]}
              onBlur={(e) => {
                const next = e.target.value.trim()
                if (next !== service.base_url) onUpdate({ base_url: next })
              }}
            />
          </SettingRow>
          <KeyField
            service={service}
            name={name}
            saving={saving}
            testing={testing}
            testBusy={testBusy}
            result={result}
            onTest={onTest}
            onSaveKey={onSaveKey}
          />
          <SettingRow
            title={t("service.models")}
            description={t("service.modelsHint")}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {service.models.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  {t("service.noModels")}
                </span>
              ) : (
                service.models.map((model) => (
                  <span
                    key={model}
                    className="inline-flex items-center gap-1 rounded-full border bg-background py-0.5 pr-1 pl-2.5 font-mono text-xs"
                  >
                    {model}
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={t("service.removeModel", { model })}
                      title={t("service.removeModel", { model })}
                      disabled={saving}
                      onClick={() =>
                        onUpdate({
                          models: service.models.filter((m) => m !== model),
                        })
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <Input
              className="h-8 font-mono text-xs"
              value={modelDraft}
              placeholder={t("service.addModelPlaceholder")}
              aria-label={t("service.addModel")}
              onChange={(e) => setModelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addModel(modelDraft)
                }
              }}
              onBlur={() => addModel(modelDraft)}
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <span>{t("service.suggested")}</span>
                {suggestions.map((model) => (
                  <Button
                    key={model}
                    variant="ghost"
                    size="xs"
                    className="font-mono"
                    disabled={saving}
                    onClick={() => addModel(model)}
                  >
                    <Plus />
                    {model}
                  </Button>
                ))}
              </div>
            )}
          </SettingRow>
          <div className="flex justify-end p-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={saving}
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 />
              {t("service.remove")}
            </Button>
          </div>
        </SettingCard>
      </CollapsibleContent>
      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("service.removeConfirmTitle", { name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("service.removeConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("service.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onRemove}>
              {t("service.removeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  )
}

/**
 * The key, as the keychain holds it: never shown back, only whether one is
 * saved; replacing it opens the same field a first key goes into. The test
 * sits beside the label because it tests this key.
 */
function KeyField({
  service,
  name,
  saving,
  testing,
  testBusy,
  result,
  onTest,
  onSaveKey,
}: {
  service: ImageServiceView
  name: string
  saving: boolean
  testing: boolean
  testBusy: boolean
  result: TestOutcome | undefined
  onTest: () => void
  onSaveKey: (value: string) => Promise<boolean>
}) {
  const t = useTranslations("ImageGenerationSettings")
  const [replacing, setReplacing] = useState(false)
  const [draft, setDraft] = useState("")
  const [visible, setVisible] = useState(false)
  const inputId = `image-service-key-${service.id}`
  const editing = !service.has_key || replacing
  const canTest = service.has_key && service.models.length > 0

  const stopEditing = () => {
    setDraft("")
    setReplacing(false)
    setVisible(false)
  }

  const submit = async () => {
    const value = draft.trim()
    if (!value) return
    if (await onSaveKey(value)) stopEditing()
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={editing ? inputId : undefined} className="text-sm">
          {t("key.title")}
        </Label>
        <Button
          variant="outline"
          size="xs"
          disabled={!canTest || testBusy}
          title={
            !service.has_key
              ? t("key.needsKeyFirst")
              : service.models.length === 0
                ? t("test.needsModel")
                : t("test.description", { model: service.models[0] })
          }
          onClick={onTest}
        >
          {testing && <Loader2 className="animate-spin" />}
          {testing ? t("test.running") : t("test.run")}
        </Button>
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <InputGroup className="h-8 flex-1">
            <InputGroupInput
              id={inputId}
              type={visible ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={draft}
              placeholder={t("key.placeholder")}
              aria-label={t("key.label", { service: name })}
              autoFocus={replacing}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit()
                if (e.key === "Escape" && replacing) stopEditing()
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label={visible ? t("key.hide") : t("key.show")}
                title={visible ? t("key.hide") : t("key.show")}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <Button
            size="sm"
            disabled={saving || !draft.trim()}
            onClick={() => void submit()}
          >
            {t("key.save")}
          </Button>
          {replacing && (
            <Button size="sm" variant="ghost" onClick={stopEditing}>
              {t("key.cancel")}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-4xl border border-input bg-input/30 px-3 text-muted-foreground">
            <span aria-hidden="true" className="text-sm tracking-widest">
              ••••••••
            </span>
            <span className="truncate text-xs">{t("key.saved")}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => setReplacing(true)}
          >
            {t("key.replace")}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={saving}
            aria-label={t("key.remove")}
            title={t("key.remove")}
            onClick={() => void onSaveKey("")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}

      {result && <TestResultLine result={result} />}
    </div>
  )
}

function TestResultLine({ result }: { result: TestOutcome }) {
  const t = useTranslations("ImageGenerationSettings")
  if ("error" in result) {
    return (
      <p role="status" className="flex gap-1.5 text-xs text-destructive">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0 break-words">{result.error}</span>
      </p>
    )
  }
  return (
    <div role="status" className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- a data URL */}
      <img
        src={`data:${result.image.mime_type};base64,${result.image.data}`}
        alt=""
        className="size-14 rounded-md border object-cover"
      />
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
          {t("test.ok", {
            model: result.model,
            seconds: (result.elapsed_ms / 1000).toFixed(1),
          })}
        </p>
        <p>{t("test.cost")}</p>
      </div>
    </div>
  )
}
