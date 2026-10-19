import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ConnectionState } from "@/contexts/acp-connections-context"

const h = vi.hoisted(() => {
  const conns = new Map<string, unknown>()
  const listeners = new Map<string, Set<() => void>>()
  const store = {
    getConnection: (key: string) => conns.get(key),
    subscribeKey: (key: string, cb: () => void) => {
      let set = listeners.get(key)
      if (!set) {
        set = new Set()
        listeners.set(key, set)
      }
      set.add(cb)
      return () => set.delete(cb)
    },
  }
  const set = (key: string, conn: unknown) => {
    if (conn === undefined) conns.delete(key)
    else conns.set(key, conn)
    listeners.get(key)?.forEach((cb) => cb())
  }
  return { conns, listeners, store, set, hasProvider: true }
})

vi.mock("@/contexts/acp-connections-context", () => ({
  useOptionalConnectionStore: () => (h.hasProvider ? h.store : null),
}))

import {
  tabLiveState,
  useAnyTabNeedsInput,
  useTabLiveState,
} from "./use-open-tabs-live-state"

function conn(patch: Partial<ConnectionState>): ConnectionState {
  return {
    status: "connected",
    pendingPermission: null,
    pendingQuestion: null,
    pendingAskQuestion: null,
    pendingPlanApproval: null,
    ...patch,
  } as ConnectionState
}

describe("tabLiveState", () => {
  it("is null without a connection, or for an idle one", () => {
    expect(tabLiveState(undefined)).toBeNull()
    expect(tabLiveState(conn({}))).toBeNull()
  })

  it("is prompting during a turn", () => {
    expect(tabLiveState(conn({ status: "prompting" }))).toBe("prompting")
  })

  it.each([
    "pendingPermission",
    "pendingQuestion",
    "pendingAskQuestion",
    "pendingPlanApproval",
  ] as const)("needs input while %s is set, even mid-turn", (field) => {
    expect(
      tabLiveState(conn({ status: "prompting", [field]: {} as never }))
    ).toBe("needs_input")
  })
})

describe("useTabLiveState / useAnyTabNeedsInput", () => {
  beforeEach(() => {
    h.conns.clear()
    h.listeners.clear()
    h.hasProvider = true
  })

  it("follows the tab's connection", () => {
    const { result } = renderHook(() => useTabLiveState("tab-a"))
    expect(result.current).toBeNull()
    act(() => h.set("tab-a", conn({ status: "prompting" })))
    expect(result.current).toBe("prompting")
    act(() =>
      h.set(
        "tab-a",
        conn({ status: "prompting", pendingPermission: {} as never })
      )
    )
    expect(result.current).toBe("needs_input")
  })

  it("is true only while one of the given tabs needs input", () => {
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useAnyTabNeedsInput(ids),
      { initialProps: { ids: ["tab-a", "tab-b"] } }
    )
    expect(result.current).toBe(false)
    act(() => h.set("tab-c", conn({ pendingAskQuestion: {} as never })))
    expect(result.current).toBe(false)
    act(() => h.set("tab-b", conn({ pendingAskQuestion: {} as never })))
    expect(result.current).toBe(true)
    rerender({ ids: ["tab-a"] })
    expect(result.current).toBe(false)
  })

  it("reports nothing outside the connections provider", () => {
    h.hasProvider = false
    h.conns.set("tab-a", conn({ pendingPermission: {} as never }))
    expect(renderHook(() => useTabLiveState("tab-a")).result.current).toBeNull()
    expect(
      renderHook(() => useAnyTabNeedsInput(["tab-a"])).result.current
    ).toBe(false)
  })
})
