"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, Power, RotateCcw } from "lucide-react"

import { useAppUpdate } from "@/components/providers/update-provider"
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
import { Button } from "@/components/ui/button"
import { acpListConnections } from "@/lib/api"
import { extractAppCommandError, toErrorMessage } from "@/lib/app-error"
import { restartServer } from "@/lib/server-restart"
import {
  beginOwnServerRestart,
  getServerUpdateStatus,
  waitForServerHealthy,
  type ServerUpdateStatus,
} from "@/lib/updater"

type Phase =
  | { kind: "idle" }
  | { kind: "countdown"; seconds: number }
  | { kind: "waiting" }

/** How long the restarted server gets to answer `/health` again. */
const HEALTHY_TIMEOUT_MS = 90_000

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Settings → System → "Restart codeg" (keh4l build): restarts the codeg
 * server this page is connected to — to apply settings that only take effect
 * on a restart, or to recover a server that misbehaves — without a shell on
 * the host. Same flow as the update's restart: confirm, count down, wait for
 * `/health`, reload.
 *
 * Only on a server that says it can (`restartSupported`); a desktop window and
 * a browser connected to a desktop's web service never show it.
 */
export function ServerRestartCard() {
  const t = useTranslations("ServerRestart")
  const update = useAppUpdate()
  const [status, setStatus] = useState<ServerUpdateStatus | null>(null)
  // Sessions in the middle of a reply, counted when the dialog opens; null
  // while it is shut.
  const [confirmRunning, setConfirmRunning] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })

  useEffect(() => {
    let alive = true
    getServerUpdateStatus()
      .then((next) => {
        if (alive) setStatus(next)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const openConfirm = useCallback(async () => {
    let running = 0
    try {
      const connections = await acpListConnections()
      running = connections.filter((c) => c.status === "prompting").length
    } catch {
      // The count only sharpens the warning; the restart doesn't need it.
    }
    setConfirmRunning(running)
  }, [])

  const restart = useCallback(async () => {
    setConfirmRunning(null)
    // Keeps the page's own "the server changed" notice quiet: this flow
    // reports the outcome and reloads the page itself.
    const endOwnRestart = beginOwnServerRestart()
    let reloading = false
    try {
      const result = await restartServer()
      for (
        let seconds = Math.ceil(result.restartDelayMs / 1000);
        seconds > 0;
        seconds -= 1
      ) {
        setPhase({ kind: "countdown", seconds })
        await sleep(1000)
      }
      setPhase({ kind: "waiting" })
      const healthy = await waitForServerHealthy({
        timeoutMs: HEALTHY_TIMEOUT_MS,
        intervalMs: 1500,
      })
      if (!healthy) {
        toast.error(t("timeout"))
        return
      }
      toast.success(t("done"))
      reloading = true
      window.location.reload()
    } catch (err) {
      toast.error(
        // An update, a rollback or another window's restart got there first.
        extractAppCommandError(err)?.code === "already_exists"
          ? t("busy")
          : t("failed", { message: toErrorMessage(err) })
      )
    } finally {
      if (!reloading) {
        endOwnRestart()
        setPhase({ kind: "idle" })
      }
    }
  }, [t])

  if (!status?.restartSupported) return null

  const control =
    phase.kind === "idle" ? (
      <Button
        size="sm"
        variant="outline"
        onClick={() => void openConfirm()}
        // An update, a rollback or a restart from another window is already
        // taking the server down (or about to).
        disabled={update?.isBusy ?? false}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {t("button")}
      </Button>
    ) : (
      <span
        role="status"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {phase.kind === "countdown"
          ? t("countdown", { seconds: phase.seconds })
          : t("waiting")}
      </span>
    )

  return (
    <>
      <SettingsSection
        icon={Power}
        title={t("title")}
        description={
          <>
            {t("description")}
            <span className="mt-1 block">
              {status.capability === "supervised"
                ? t("methodSupervised")
                : t("methodReexec")}
            </span>
          </>
        }
        control={control}
      />
      <AlertDialog
        open={confirmRunning !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRunning(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirmRunning !== null && confirmRunning > 0 ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              {t("confirmRunning", { count: confirmRunning })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("confirmIdle")}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t("confirmSettings")}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void restart()}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
