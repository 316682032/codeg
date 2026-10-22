/**
 * Restarting the codeg server on request (keh4l build): Settings → System →
 * "Restart codeg", and the restart a staged backup restore waits for. See
 * `src-tauri/src/web/handlers/server_restart.rs`.
 */
import { getTransport } from "@/lib/transport"
import type { ServerUpdateCapability } from "@/lib/updater"

export interface ServerRestartResult {
  /** Relaunch delay (ms) the countdown should use. */
  restartDelayMs: number
  capability: ServerUpdateCapability
}

/** Responds, then restarts the server (it exits or re-execs a moment later).
 * Rejects while an update or another restart is in flight. */
export function restartServer(): Promise<ServerRestartResult> {
  return getTransport().call<ServerRestartResult>("restart_server")
}
