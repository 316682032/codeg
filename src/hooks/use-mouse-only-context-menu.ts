import { useCallback, useRef, useState, type PointerEvent } from "react"
import { flushSync } from "react-dom"

/** Radix turns the iOS long-press callout off on its trigger; this turns it
 * back on. The property is inherited, so it covers everything inside. */
const TOUCH_CALLOUT_STYLE = { WebkitTouchCallout: "default" } as const

/**
 * A context menu that leaves a finger's long press to the phone (keh4l
 * build).
 *
 * Radix's ContextMenu opens on a touch or pen long press as well as on a right
 * click. Wherever its trigger covers text — a whole conversation, the
 * composer — that long press is the one that should select a word and bring
 * up the system's own Copy / Select All bar, and the menu takes it instead:
 * Radix arms a 700 ms timer on `pointerdown`, and cancels the `contextmenu`
 * event an Android long press sends, which cancels the selection with it.
 *
 * Spread the result on a `ContextMenuTrigger` (or-ing in any `disabled` of its
 * own). A touch or pen press switches the trigger off before Radix sees it;
 * the next mouse press switches it back on, so a right click still opens the
 * menu, on a touch-screen laptop as anywhere else.
 */
export function useMouseOnlyContextMenu() {
  const [direct, setDirect] = useState(false)
  const directRef = useRef(false)

  const onPointerDownCapture = useCallback((event: PointerEvent) => {
    const next = event.pointerType === "touch" || event.pointerType === "pen"
    if (next === directRef.current) return
    directRef.current = next
    // Synchronously: the trigger's own `pointerdown` handler runs in the
    // bubble phase of this very event and must already find it switched.
    flushSync(() => setDirect(next))
  }, [])

  return {
    disabled: direct,
    onPointerDownCapture,
    style: TOUCH_CALLOUT_STYLE,
  }
}
