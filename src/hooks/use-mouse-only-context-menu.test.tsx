import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useMouseOnlyContextMenu } from "./use-mouse-only-context-menu"

/** Radix opens its menu after a touch has been held this long. */
const RADIX_LONG_PRESS_MS = 700

function Menu({ mouseOnly }: { mouseOnly: boolean }) {
  const trigger = useMouseOnlyContextMenu()
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild {...(mouseOnly ? trigger : {})}>
        <div data-testid="panel">
          <p data-testid="text">A reply worth copying.</p>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>New conversation</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/**
 * A press that names its `pointerType`. jsdom has no `PointerEvent`, and
 * `fireEvent.pointerDown(el, { pointerType })` drops the property; React reads
 * it straight off the native event, so it is pinned on a MouseEvent.
 */
function press(pointerType: "mouse" | "touch" | "pen") {
  const event = new MouseEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
  })
  Object.defineProperty(event, "pointerType", { value: pointerType })
  fireEvent(screen.getByTestId("text"), event)
}

/** What an Android long press, or a right click, sends. Returns whether the
 * page let the platform go on (true) or cancelled it. */
function contextMenu(): boolean {
  return fireEvent.contextMenu(screen.getByTestId("text"))
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useMouseOnlyContextMenu", () => {
  it("is needed: a plain trigger opens on a held touch", () => {
    render(<Menu mouseOnly={false} />)
    press("touch")
    act(() => {
      vi.advanceTimersByTime(RADIX_LONG_PRESS_MS + 100)
    })
    expect(screen.queryByRole("menu")).not.toBeNull()
  })

  it("leaves a held touch to the phone", () => {
    render(<Menu mouseOnly />)
    press("touch")
    act(() => {
      vi.advanceTimersByTime(RADIX_LONG_PRESS_MS + 100)
    })
    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("does not cancel the contextmenu an Android long press sends", () => {
    render(<Menu mouseOnly />)
    press("touch")
    expect(contextMenu()).toBe(true)
    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("treats a pen like a finger", () => {
    render(<Menu mouseOnly />)
    press("pen")
    act(() => {
      vi.advanceTimersByTime(RADIX_LONG_PRESS_MS + 100)
    })
    expect(contextMenu()).toBe(true)
    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("still opens on a right click", () => {
    render(<Menu mouseOnly />)
    press("mouse")
    expect(contextMenu()).toBe(false)
    expect(screen.queryByRole("menu")).not.toBeNull()
  })

  it("opens on a right click again after a touch", () => {
    render(<Menu mouseOnly />)
    press("touch")
    press("mouse")
    expect(contextMenu()).toBe(false)
    expect(screen.queryByRole("menu")).not.toBeNull()
  })
})
