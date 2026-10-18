"use client"

/**
 * Settings → Translation.
 *
 * Laid out the way mature translators present the same choices (Immersive
 * Translate, Easydict, Read Frog, Bob; compared 2026-10-15): the engines
 * first, since nothing works without a key — a short list where picking one
 * makes it the primary and each row says whether it is ready, opening onto
 * its key, model and test; then what gets translated (replies, messages);
 * then the glossary as a table; then the cache.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BookText,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MessageSquareText,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { SettingCard, SettingRow } from "@/components/shared/setting-card"
import { SettingsSection } from "@/components/shared/settings-section"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useIsMac } from "@/hooks/use-is-mac"
import { useShortcutSettings } from "@/hooks/use-shortcut-settings"
import { primeTranslationSettings } from "@/hooks/use-translation-settings"
import {
  clearTranslationCache,
  getTranslationSettings,
  saveTranslationSettings,
  testTranslationProvider,
  type TranslationGlossaryEntry,
  type TranslationProvider,
  type TranslationSettings as TranslationSettingsValue,
  type TranslationSettingsInput,
  type TranslationSettingsView,
  type TranslationTestResult,
} from "@/lib/api"
import { toErrorMessage } from "@/lib/app-error"
import { formatShortcutLabel } from "@/lib/keyboard-shortcuts"
import { openUrl } from "@/lib/platform"
import { describeTranslationError } from "@/lib/translation/errors"
import {
  languageLabel,
  resolveOutputTarget,
  TRANSLATION_LANGUAGES,
} from "@/lib/translation/languages"
import { cn } from "@/lib/utils"

type ModelHint = "balanced" | "quality" | "speed"

interface ProviderInfo {
  id: TranslationProvider
  /** Recommended first. */
  models: { id: string; hint: ModelHint }[]
  consoleUrl: string
  defaultBaseUrl: string
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: "dashscope",
    models: [
      { id: "qwen-mt-flash", hint: "balanced" },
      { id: "qwen-mt-plus", hint: "quality" },
      { id: "qwen-mt-lite", hint: "speed" },
    ],
    consoleUrl: "https://bailian.console.aliyun.com/",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    id: "tokenhub",
    models: [
      { id: "hy-mt2-plus", hint: "balanced" },
      { id: "hy-mt2-pro", hint: "quality" },
      { id: "hy-mt2-lite", hint: "speed" },
    ],
    consoleUrl: "https://console.cloud.tencent.com/tokenhub/apikey",
    defaultBaseUrl: "https://tokenhub.tencentmaas.com/v1",
  },
]

/** qwen-mt-lite has its own quota, so a rate-limited qwen-mt model hands over
 *  to it first (`translation::engine_chain`). */
const QWEN_MT_LITE = "qwen-mt-lite"

/** A test answer slower than this is flagged as slow. */
const SLOW_TEST_MS = 2000

const FOLLOW_UI = "__follow_ui__"

type TestOutcome = TranslationTestResult | { error: string }

function toInput(view: TranslationSettingsView): TranslationSettingsValue {
  // The view's `has_*_key` flags are not settings and must not travel back.
  const { has_dashscope_key: _d, has_tokenhub_key: _t, ...settings } = view
  void _d
  void _t
  return settings
}

function hasKeyFor(
  view: TranslationSettingsView,
  provider: TranslationProvider
): boolean {
  return provider === "dashscope"
    ? view.has_dashscope_key
    : view.has_tokenhub_key
}

function modelFor(
  view: TranslationSettingsView,
  provider: TranslationProvider
): string {
  return provider === "dashscope" ? view.dashscope_model : view.tokenhub_model
}

/** A full load, as the settings nav does on Windows, keeping the query that
 *  names a remote workspace. */
function openShortcutSettings() {
  window.location.assign(`/settings/shortcuts${window.location.search}`)
}

export function TranslationSettings() {
  const t = useTranslations("TranslationSettings")
  const tErrors = useTranslations("Translation")
  const locale = useLocale()
  const isMac = useIsMac()
  const { shortcuts } = useShortcutSettings()

  const [view, setView] = useState<TranslationSettingsView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<
    Partial<Record<TranslationProvider, boolean>>
  >({})
  const [testing, setTesting] = useState<TranslationProvider | null>(null)
  const [testResults, setTestResults] = useState<
    Partial<Record<TranslationProvider, TestOutcome>>
  >({})
  const [clearingCache, setClearingCache] = useState(false)

  useEffect(() => {
    let cancelled = false
    getTranslationSettings()
      .then((loaded) => {
        if (cancelled) return
        setView(loaded)
        // Open what needs doing: a primary engine with no key yet.
        if (!hasKeyFor(loaded, loaded.provider)) {
          setExpanded({ [loaded.provider]: true })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(toErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(
    async (
      patch: Partial<TranslationSettingsValue>,
      keys: Pick<
        TranslationSettingsInput,
        "dashscope_api_key" | "tokenhub_api_key"
      > = {}
    ): Promise<boolean> => {
      if (!view) return false
      const previous = view
      // Optimistic, so a switch moves under the pointer.
      setView({ ...view, ...patch })
      setSaving(true)
      try {
        const saved = await saveTranslationSettings({
          ...toInput(view),
          ...patch,
          ...keys,
        })
        setView(saved)
        primeTranslationSettings(saved)
        return true
      } catch (err) {
        setView(previous)
        toast.error(t("saveFailed", { message: toErrorMessage(err) }))
        return false
      } finally {
        setSaving(false)
      }
    },
    [t, view]
  )

  const saveKey = useCallback(
    async (provider: TranslationProvider, value: string): Promise<boolean> => {
      const field =
        provider === "dashscope" ? "dashscope_api_key" : "tokenhub_api_key"
      const ok = await save({}, { [field]: value })
      if (ok) {
        setTestResults((results) => ({ ...results, [provider]: undefined }))
        toast.success(value ? t("keySaved") : t("keyRemoved"))
      }
      return ok
    },
    [save, t]
  )

  const runTest = useCallback(
    async (provider: TranslationProvider) => {
      setTesting(provider)
      try {
        const result = await testTranslationProvider(provider)
        setTestResults((results) => ({ ...results, [provider]: result }))
      } catch (err) {
        setTestResults((results) => ({
          ...results,
          [provider]: { error: describeTranslationError(err, tErrors) },
        }))
      } finally {
        setTesting(null)
      }
    },
    [tErrors]
  )

  const handleClearCache = useCallback(async () => {
    setClearingCache(true)
    try {
      const removed = await clearTranslationCache()
      toast.success(t("cacheCleared", { count: removed }))
    } catch (err) {
      toast.error(t("saveFailed", { message: toErrorMessage(err) }))
    } finally {
      setClearingCache(false)
    }
  }, [t])

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

  const providerName = (id: TranslationProvider) => t(`providers.${id}`)
  const languageOptions = TRANSLATION_LANGUAGES.map((code) => (
    <SelectItem key={code} value={code}>
      {languageLabel(code, locale)}
    </SelectItem>
  ))
  const uiLanguage = languageLabel(resolveOutputTarget(null, locale), locale)
  const translateShortcut = shortcuts.translate_input
    ? formatShortcutLabel(shortcuts.translate_input, isMac)
    : null

  // Mirrors `translation::engine_chain`: what a rate-limited primary hands
  // over to, in order.
  const other: TranslationProvider =
    view.provider === "dashscope" ? "tokenhub" : "dashscope"
  const fallbackSteps = [
    ...(view.provider === "dashscope" && view.dashscope_model !== QWEN_MT_LITE
      ? [QWEN_MT_LITE]
      : []),
    ...(hasKeyFor(view, other)
      ? [`${providerName(other)} ${modelFor(view, other)}`]
      : []),
  ]

  return (
    <ScrollArea className="h-full">
      <div className="w-full space-y-4 p-3 md:p-4">
        <section className="space-y-1">
          <h1 className="text-sm font-semibold">{t("title")}</h1>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </section>

        <SettingsSection
          icon={Cpu}
          title={t("engine.title")}
          description={t("engine.description")}
        >
          <SettingCard>
            <RadioGroup
              value={view.provider}
              onValueChange={(value) =>
                void save({ provider: value as TranslationProvider })
              }
              disabled={saving}
              aria-label={t("engine.title")}
              className="gap-0 divide-y divide-border/60"
            >
              {PROVIDERS.map((provider) => (
                <EngineItem
                  key={provider.id}
                  provider={provider}
                  name={providerName(provider.id)}
                  view={view}
                  saving={saving}
                  expanded={expanded[provider.id] ?? false}
                  onExpandedChange={(open) =>
                    setExpanded((state) => ({ ...state, [provider.id]: open }))
                  }
                  testing={testing}
                  result={testResults[provider.id]}
                  onTest={() => void runTest(provider.id)}
                  onSaveKey={(value) => saveKey(provider.id, value)}
                  onSave={save}
                />
              ))}
            </RadioGroup>
            <SettingRow
              title={t("engine.fallback")}
              description={
                fallbackSteps.length > 0
                  ? t("engine.fallbackPath", {
                      path: fallbackSteps.join(" → "),
                    })
                  : t("engine.fallbackNone")
              }
              htmlFor="translation-fallback"
              control={
                <Switch
                  id="translation-fallback"
                  checked={view.fallback_enabled}
                  disabled={saving}
                  onCheckedChange={(next) =>
                    void save({ fallback_enabled: next })
                  }
                />
              }
            />
          </SettingCard>
        </SettingsSection>

        <SettingsSection
          icon={MessageSquareText}
          title={t("output.title")}
          description={t("output.description")}
          htmlFor="translation-output-auto"
          control={
            <Switch
              id="translation-output-auto"
              checked={view.output_auto}
              disabled={saving}
              onCheckedChange={(next) => void save({ output_auto: next })}
            />
          }
        >
          <SettingCard>
            <SettingRow
              title={t("output.target")}
              htmlFor="translation-output-target"
              control={
                <Select
                  value={view.output_target ?? FOLLOW_UI}
                  onValueChange={(value) =>
                    void save({
                      output_target: value === FOLLOW_UI ? null : value,
                    })
                  }
                  disabled={saving}
                >
                  <SelectTrigger
                    id="translation-output-target"
                    className="w-56"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FOLLOW_UI}>
                      {t("output.followUi", { language: uiLanguage })}
                    </SelectItem>
                    {languageOptions}
                  </SelectContent>
                </Select>
              }
            />
            <SettingRow
              title={t("output.questions")}
              description={t("output.questionsDescription")}
              htmlFor="translation-question-auto"
              control={
                <Switch
                  id="translation-question-auto"
                  checked={view.question_auto}
                  disabled={saving}
                  onCheckedChange={(next) => void save({ question_auto: next })}
                />
              }
            />
            <SettingRow
              title={t("output.plans")}
              description={t("output.plansDescription")}
              htmlFor="translation-plan-auto"
              control={
                <Switch
                  id="translation-plan-auto"
                  checked={view.plan_auto}
                  disabled={saving}
                  onCheckedChange={(next) => void save({ plan_auto: next })}
                />
              }
            />
          </SettingCard>
        </SettingsSection>

        <SettingsSection
          icon={PenLine}
          title={t("input.title")}
          description={t("input.description")}
        >
          <SettingCard>
            <SettingRow
              title={t("input.target")}
              htmlFor="translation-input-target"
              control={
                <Select
                  value={view.input_target}
                  onValueChange={(value) => void save({ input_target: value })}
                  disabled={saving}
                >
                  <SelectTrigger id="translation-input-target" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{languageOptions}</SelectContent>
                </Select>
              }
            />
            <SettingRow
              title={t("input.onSend", {
                language: languageLabel(view.input_target, locale),
              })}
              description={t("input.onSendDescription")}
              htmlFor="translation-input-on-send"
              control={
                <Switch
                  id="translation-input-on-send"
                  checked={view.input_translate_on_send}
                  disabled={saving}
                  onCheckedChange={(next) =>
                    void save({ input_translate_on_send: next })
                  }
                />
              }
            />
            <SettingRow
              title={t("input.shortcut")}
              control={
                <div className="flex items-center gap-2">
                  {translateShortcut ? (
                    <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80">
                      {translateShortcut}
                    </kbd>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("input.shortcutNone")}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={openShortcutSettings}
                  >
                    {t("input.shortcutEdit")}
                  </Button>
                </div>
              }
            />
          </SettingCard>
        </SettingsSection>

        <GlossarySection
          entries={view.glossary}
          saving={saving}
          onSave={(glossary) => save({ glossary })}
        />

        <SettingsSection
          icon={Database}
          title={t("cache.title")}
          description={t("cache.description")}
          control={
            <Button
              size="sm"
              variant="outline"
              disabled={clearingCache}
              onClick={() => void handleClearCache()}
            >
              {clearingCache && <Loader2 className="size-3.5 animate-spin" />}
              {t("cache.clear")}
            </Button>
          }
        />
      </div>
    </ScrollArea>
  )
}

/**
 * One engine: a row saying what it is, what it does now and whether it can
 * run, opening onto its key, model and test. The radio makes it the primary;
 * an engine without a key cannot be picked, so the page never points every
 * translation at something that is bound to fail.
 */
function EngineItem({
  provider,
  name,
  view,
  saving,
  expanded,
  onExpandedChange,
  testing,
  result,
  onTest,
  onSaveKey,
  onSave,
}: {
  provider: ProviderInfo
  name: string
  view: TranslationSettingsView
  saving: boolean
  expanded: boolean
  onExpandedChange: (open: boolean) => void
  testing: TranslationProvider | null
  result: TestOutcome | undefined
  onTest: () => void
  onSaveKey: (value: string) => Promise<boolean>
  onSave: (patch: Partial<TranslationSettingsValue>) => Promise<boolean>
}) {
  const t = useTranslations("TranslationSettings")
  const id = provider.id
  const hasKey = hasKeyFor(view, id)
  const isPrimary = view.provider === id
  const model = modelFor(view, id)
  const baseUrl =
    id === "dashscope" ? view.dashscope_base_url : view.tokenhub_base_url
  const role = isPrimary
    ? t("engine.primary")
    : view.fallback_enabled && hasKey
      ? t("engine.backup")
      : t("engine.idle")
  const pickable = hasKey || isPrimary

  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange}>
      <div className="flex items-center gap-3 p-3">
        <RadioGroupItem
          value={id}
          disabled={saving || !pickable}
          aria-label={t("engine.setPrimary", { provider: name })}
          title={pickable ? undefined : t("engine.needsKeyFirst")}
        />
        <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {model} · {role}
            </span>
          </span>
          {hasKey ? (
            <Badge variant="outline">
              <CheckCircle2 className="text-emerald-500" />
              {t("engine.configured")}
            </Badge>
          ) : isPrimary ? (
            <Badge variant="destructive">
              <CircleAlert />
              {t("engine.needsSetup")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              {t("engine.notSetUp")}
            </Badge>
          )}
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="ml-7 divide-y divide-border/60 border-t border-border/60">
        <KeyField
          provider={provider}
          name={name}
          hasKey={hasKey}
          saving={saving}
          testing={testing}
          result={result}
          onTest={onTest}
          onSaveKey={onSaveKey}
        />
        <SettingRow
          title={t("engine.model")}
          htmlFor={`translation-model-${id}`}
          control={
            <Select
              value={model}
              onValueChange={(value) =>
                void onSave(
                  id === "dashscope"
                    ? { dashscope_model: value }
                    : { tokenhub_model: value }
                )
              }
              disabled={saving}
            >
              <SelectTrigger id={`translation-model-${id}`} className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {provider.models.map((m) => (
                  <SelectItem
                    key={m.id}
                    value={m.id}
                    description={t(`engine.modelHint.${m.hint}`)}
                  >
                    {m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        {/* Rarely changed, so folded away under the two things a user does
            set: the key and the model. */}
        <Collapsible>
          <CollapsibleTrigger className="group flex w-full items-center gap-1 px-3 py-2 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset">
            <ChevronRight
              className="size-3.5 transition-transform group-data-[state=open]:rotate-90"
              aria-hidden="true"
            />
            {t("engine.advanced")}
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border/60">
            <SettingRow
              title={t("engine.baseUrl")}
              description={t("engine.baseUrlHint")}
              htmlFor={`translation-base-url-${id}`}
            >
              <div className="flex items-center gap-2">
                <Input
                  id={`translation-base-url-${id}`}
                  key={baseUrl}
                  className="h-8 flex-1 font-mono text-xs"
                  defaultValue={baseUrl}
                  placeholder={provider.defaultBaseUrl}
                  onBlur={(e) => {
                    const next = e.target.value.trim()
                    if (next === baseUrl) return
                    void onSave(
                      id === "dashscope"
                        ? { dashscope_base_url: next }
                        : { tokenhub_base_url: next }
                    )
                  }}
                />
                {baseUrl && baseUrl !== provider.defaultBaseUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() =>
                      void onSave(
                        id === "dashscope"
                          ? { dashscope_base_url: provider.defaultBaseUrl }
                          : { tokenhub_base_url: provider.defaultBaseUrl }
                      )
                    }
                  >
                    {t("engine.resetBaseUrl")}
                  </Button>
                )}
              </div>
            </SettingRow>
          </CollapsibleContent>
        </Collapsible>
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * The key, as the keychain holds it: never shown back, only whether one is
 * saved; replacing it opens the same field a first key goes into. The test
 * sits beside the label because it tests this key, and its answer stays under
 * the field until the key changes.
 */
function KeyField({
  provider,
  name,
  hasKey,
  saving,
  testing,
  result,
  onTest,
  onSaveKey,
}: {
  provider: ProviderInfo
  name: string
  hasKey: boolean
  saving: boolean
  testing: TranslationProvider | null
  result: TestOutcome | undefined
  onTest: () => void
  onSaveKey: (value: string) => Promise<boolean>
}) {
  const t = useTranslations("TranslationSettings")
  const [replacing, setReplacing] = useState(false)
  const [draft, setDraft] = useState("")
  const [visible, setVisible] = useState(false)
  const inputId = `translation-key-${provider.id}`
  const editing = !hasKey || replacing
  const running = testing === provider.id

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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => void openUrl(provider.consoleUrl)}
          >
            <ExternalLink />
            {t("key.getKey")}
          </Button>
          <Button
            variant="outline"
            size="xs"
            disabled={!hasKey || testing !== null}
            title={hasKey ? t("test.description") : t("engine.needsKeyFirst")}
            onClick={onTest}
          >
            {running && <Loader2 className="animate-spin" />}
            {running ? t("test.running") : t("test.run")}
          </Button>
        </div>
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
              aria-label={t("key.label", { provider: name })}
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
  const t = useTranslations("TranslationSettings")
  if ("error" in result) {
    return (
      <p role="status" className="flex gap-1.5 text-xs text-destructive">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0 break-words">{result.error}</span>
      </p>
    )
  }
  const slow = result.elapsed_ms > SLOW_TEST_MS
  return (
    <div role="status" className="space-y-0.5 text-xs">
      <p
        className={cn(
          "flex items-center gap-1.5",
          slow ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
        )}
      >
        <CheckCircle2
          className={cn(
            "size-3.5 shrink-0",
            slow ? "text-amber-500" : "text-emerald-500"
          )}
        />
        {t(slow ? "test.slow" : "test.ok", {
          model: result.model,
          ms: result.elapsed_ms,
        })}
      </p>
      <p className="pl-5 text-muted-foreground">{result.translation}</p>
    </div>
  )
}

interface GlossaryRow {
  key: number
  source: string
  /** Empty: keep the term as written. */
  target: string
}

function rowsFrom(entries: TranslationGlossaryEntry[]): GlossaryRow[] {
  return entries.map((e, i) => ({
    key: i,
    source: e.source,
    // "Keep as written" is stored as the term itself.
    target: e.target === e.source ? "" : e.target,
  }))
}

/** What the backend stores for these rows: an empty translation becomes the
 *  term itself, and blank terms and repeats are dropped. */
function entriesFrom(rows: GlossaryRow[]): TranslationGlossaryEntry[] {
  const entries: TranslationGlossaryEntry[] = []
  for (const row of rows) {
    const source = row.source.trim()
    if (!source || entries.some((e) => e.source === source)) continue
    entries.push({ source, target: row.target.trim() || source })
  }
  return entries
}

/** One `term = translation` per line; a line with only a term keeps it as
 *  written. */
function parseBulk(text: string): TranslationGlossaryEntry[] {
  return entriesFrom(
    text.split("\n").map((line, i) => {
      const at = line.indexOf("=")
      return at < 0
        ? { key: i, source: line, target: "" }
        : { key: i, source: line.slice(0, at), target: line.slice(at + 1) }
    })
  )
}

function formatBulk(entries: TranslationGlossaryEntry[]): string {
  return entries
    .map((e) =>
      e.target === e.source ? e.source : `${e.source} = ${e.target}`
    )
    .join("\n")
}

/**
 * Terms as a table, the way DeepL, Immersive Translate and Read Frog edit
 * them: a row per pair, saved when the row is left. "Bulk edit" swaps in the
 * `term = translation` text, for pasting a list in or copying it out.
 */
function GlossarySection({
  entries,
  saving,
  onSave,
}: {
  entries: TranslationGlossaryEntry[]
  saving: boolean
  onSave: (glossary: TranslationGlossaryEntry[]) => Promise<boolean>
}) {
  const t = useTranslations("TranslationSettings")
  const [bulk, setBulk] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [rows, setRows] = useState<GlossaryRow[]>(() => rowsFrom(entries))
  const nextKey = useRef(entries.length)
  const [focusKey, setFocusKey] = useState<number | null>(null)
  const savedJson = useMemo(() => JSON.stringify(entries), [entries])

  const commit = (list: TranslationGlossaryEntry[]) => {
    if (JSON.stringify(list) !== savedJson) void onSave(list)
  }

  const update = (key: number, patch: Partial<GlossaryRow>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    )

  const remove = (key: number) => {
    const next = rows.filter((row) => row.key !== key)
    setRows(next)
    commit(entriesFrom(next))
  }

  const add = () => {
    const key = nextKey.current++
    setRows((current) => [...current, { key, source: "", target: "" }])
    setFocusKey(key)
  }

  const toggleBulk = () => {
    // From what is on screen rather than `entries`: the save the blur just
    // started may not have come back yet.
    if (bulk) {
      const next = rowsFrom(parseBulk(bulkText))
      setRows(next)
      nextKey.current = next.length
    } else {
      setBulkText(formatBulk(entriesFrom(rows)))
    }
    setFocusKey(null)
    setBulk(!bulk)
  }

  return (
    <SettingsSection
      icon={BookText}
      title={
        <>
          {t("glossary.title")}
          {entries.length > 0 && (
            <Badge variant="secondary">{entries.length}</Badge>
          )}
        </>
      }
      description={t("glossary.description")}
      control={
        <Button variant="ghost" size="xs" onClick={toggleBulk}>
          {bulk ? t("glossary.tableEdit") : t("glossary.bulkEdit")}
        </Button>
      }
    >
      {bulk ? (
        <div className="space-y-1.5">
          <Textarea
            value={bulkText}
            rows={6}
            placeholder={t("glossary.bulkPlaceholder")}
            aria-label={t("glossary.title")}
            className="font-mono text-xs"
            onChange={(e) => setBulkText(e.target.value)}
            onBlur={() => commit(parseBulk(bulkText))}
          />
          <p className="text-xs text-muted-foreground">
            {t("glossary.bulkHint")}
          </p>
        </div>
      ) : (
        <SettingCard>
          {rows.length > 0 && (
            <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-xs text-muted-foreground">
              <span className="flex-1">{t("glossary.term")}</span>
              <span className="w-3.5" aria-hidden="true" />
              <span className="flex-1">{t("glossary.translation")}</span>
              <span className="w-6" aria-hidden="true" />
            </div>
          )}
          {rows.map((row) => {
            const removeLabel = row.source.trim()
              ? t("glossary.remove", { term: row.source.trim() })
              : t("glossary.removeEmpty")
            return (
              <div
                key={row.key}
                className="flex items-center gap-2 px-3 py-2"
                onBlur={(e) => {
                  // Leaving the row, not moving between its two fields.
                  if (
                    !e.currentTarget.contains(e.relatedTarget as Node | null)
                  ) {
                    commit(entriesFrom(rows))
                  }
                }}
              >
                <Input
                  className="h-8 flex-1"
                  value={row.source}
                  placeholder={t("glossary.termPlaceholder")}
                  aria-label={t("glossary.term")}
                  autoFocus={row.key === focusKey}
                  onChange={(e) => update(row.key, { source: e.target.value })}
                />
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="h-8 flex-1"
                  value={row.target}
                  placeholder={t("glossary.translationPlaceholder")}
                  aria-label={t("glossary.translation")}
                  onChange={(e) => update(row.key, { target: e.target.value })}
                />
                <Button
                  size="icon-xs"
                  variant="ghost"
                  disabled={saving}
                  aria-label={removeLabel}
                  title={removeLabel}
                  onClick={() => remove(row.key)}
                >
                  <Trash2 />
                </Button>
              </div>
            )
          })}
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            onClick={add}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t("glossary.add")}
          </button>
        </SettingCard>
      )}
    </SettingsSection>
  )
}
