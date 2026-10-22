import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const h = vi.hoisted(() => ({
  rawTabs: [] as { id: string; conversationId: number | null }[],
  activeTabId: null as string | null,
  pinTab: vi.fn(),
}))

vi.mock("@/stores/tab-store", () => ({
  useTabStore: {
    getState: () => ({
      rawTabs: h.rawTabs,
      activeTabId: h.activeTabId,
      pinTab: h.pinTab,
    }),
  },
}))

import {
  DOUBLE_TAP_MS,
  useMobileConversationTap,
} from "./use-mobile-conversation-tap"

function List({ isOpen, close }: { isOpen: boolean; close: () => void }) {
  const onClick = useMobileConversationTap({ isOpen, close })
  return (
    <div onClick={onClick}>
      <button data-conversation-id="5">
        <span>Five</span>
      </button>
      <button data-conversation-id="7">Seven</button>
      <button>Folder</button>
    </div>
  )
}

describe("useMobileConversationTap", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    h.pinTab.mockReset()
    h.rawTabs = [
      { id: "kept", conversationId: 3 },
      { id: "preview", conversationId: 5 },
    ]
    h.activeTabId = "preview"
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("closes the drawer a moment after a single tap, keeping nothing", () => {
    const close = vi.fn()
    render(<List isOpen close={close} />)
    fireEvent.click(screen.getByText("Five"))
    act(() => vi.advanceTimersByTime(DOUBLE_TAP_MS - 1))
    expect(close).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(close).toHaveBeenCalledTimes(1)
    expect(h.pinTab).not.toHaveBeenCalled()
  })

  it("keeps the conversation and closes at once on a double tap", () => {
    const close = vi.fn()
    render(<List isOpen close={close} />)
    fireEvent.click(screen.getByText("Five"))
    act(() => vi.advanceTimersByTime(DOUBLE_TAP_MS - 50))
    fireEvent.click(screen.getByText("Five"))
    expect(h.pinTab).toHaveBeenCalledWith("preview")
    expect(close).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(DOUBLE_TAP_MS * 2))
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("treats taps on two rows as two single taps", () => {
    const close = vi.fn()
    render(<List isOpen close={close} />)
    fireEvent.click(screen.getByText("Five"))
    fireEvent.click(screen.getByText("Seven"))
    act(() => vi.advanceTimersByTime(DOUBLE_TAP_MS))
    expect(close).toHaveBeenCalledTimes(1)
    expect(h.pinTab).not.toHaveBeenCalled()
  })

  it("leaves a drawer closed some other way alone", () => {
    const close = vi.fn()
    const { rerender } = render(<List isOpen close={close} />)
    fireEvent.click(screen.getByText("Five"))
    rerender(<List isOpen={false} close={close} />)
    act(() => vi.advanceTimersByTime(DOUBLE_TAP_MS))
    expect(close).not.toHaveBeenCalled()
  })

  it("ignores taps outside a conversation row", () => {
    const close = vi.fn()
    render(<List isOpen close={close} />)
    fireEvent.click(screen.getByText("Folder"))
    act(() => vi.advanceTimersByTime(DOUBLE_TAP_MS))
    expect(close).not.toHaveBeenCalled()
  })
})
