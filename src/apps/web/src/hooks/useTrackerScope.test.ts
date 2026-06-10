import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useTrackerScope } from "./useTrackerScope";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useTrackerScope", () => {
  it("returns 'all' when no ?trackers= param is present", () => {
    const { result } = renderHook(() => useTrackerScope());
    expect(result.current.scope).toBe("all");
    expect(result.current.isAll).toBe(true);
  });

  it("parses ?trackers=t1,t2,t3 into an ID list", () => {
    window.history.replaceState(null, "", "/?trackers=t1,t2,t3");
    const { result } = renderHook(() => useTrackerScope());
    expect(result.current.scope).toEqual(["t1", "t2", "t3"]);
    expect(result.current.isAll).toBe(false);
  });

  it("treats an empty ?trackers= value as an explicit empty selection (not 'all')", () => {
    // Distinction matters for tri-state UX: param absent = default (all),
    // param present-but-empty = user has actively deselected everything.
    window.history.replaceState(null, "", "/?trackers=");
    const { result } = renderHook(() => useTrackerScope());
    expect(result.current.scope).toEqual([]);
    expect(result.current.isAll).toBe(false);
  });

  it("writes an empty selection as ?trackers= (param present, empty value)", () => {
    const { result } = renderHook(() => useTrackerScope());
    act(() => result.current.setScope([]));
    // URLSearchParams renders an empty-value param as "trackers=" — the
    // param is present, distinguishing it from the all-default state.
    expect(window.location.search).toContain("trackers=");
    expect(result.current.scope).toEqual([]);
  });

  it("trims whitespace and drops empty segments", () => {
    window.history.replaceState(null, "", "/?trackers=t1,%20,t2,,t3");
    const { result } = renderHook(() => useTrackerScope());
    expect(result.current.scope).toEqual(["t1", "t2", "t3"]);
  });

  it("setScope writes the param to the URL and updates state", () => {
    const { result } = renderHook(() => useTrackerScope());
    act(() => result.current.setScope(["t1", "t2"]));
    expect(new URLSearchParams(window.location.search).get("trackers")).toBe("t1,t2");
    expect(result.current.scope).toEqual(["t1", "t2"]);
  });

  it("setScope('all') removes the param from the URL", () => {
    window.history.replaceState(null, "", "/?trackers=t1,t2");
    const { result } = renderHook(() => useTrackerScope());
    act(() => result.current.setScope("all"));
    expect(new URLSearchParams(window.location.search).get("trackers")).toBeNull();
    expect(result.current.scope).toBe("all");
  });

  it("preserves other URL search params when setScope writes", () => {
    window.history.replaceState(null, "", "/?tab=schedule&foo=bar");
    const { result } = renderHook(() => useTrackerScope());
    act(() => result.current.setScope(["t1"]));

    const params = new URLSearchParams(window.location.search);
    expect(params.get("trackers")).toBe("t1");
    expect(params.get("tab")).toBe("schedule");
    expect(params.get("foo")).toBe("bar");
  });

  it("preserves other URL params when clearing back to 'all'", () => {
    window.history.replaceState(null, "", "/?tab=schedule&trackers=t1");
    const { result } = renderHook(() => useTrackerScope());
    act(() => result.current.setScope("all"));

    const params = new URLSearchParams(window.location.search);
    expect(params.get("tab")).toBe("schedule");
    expect(params.get("trackers")).toBeNull();
  });

  it("uses replaceState (no new history entry)", () => {
    const initialLen = window.history.length;
    const { result } = renderHook(() => useTrackerScope());
    act(() => result.current.setScope(["t1"]));
    expect(window.history.length).toBe(initialLen);
  });

  it("syncs state across two hook instances on the same page", () => {
    const { result: instanceA } = renderHook(() => useTrackerScope());
    const { result: instanceB } = renderHook(() => useTrackerScope());
    act(() => instanceA.current.setScope(["t1", "t2"]));
    expect(instanceA.current.scope).toEqual(["t1", "t2"]);
    expect(instanceB.current.scope).toEqual(["t1", "t2"]);
  });

  it("re-reads the URL on popstate (back/forward)", () => {
    const { result } = renderHook(() => useTrackerScope());
    expect(result.current.scope).toBe("all");

    act(() => {
      window.history.replaceState(null, "", "/?trackers=t1");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.scope).toEqual(["t1"]);
  });

  it("resolveIds('all') expands to the supplied full ID list", () => {
    const { result } = renderHook(() => useTrackerScope());
    expect(result.current.resolveIds(["t1", "t2", "t3"])).toEqual(["t1", "t2", "t3"]);
  });

  it("resolveIds returns the explicit subset when scope is not 'all'", () => {
    window.history.replaceState(null, "", "/?trackers=t1,t3");
    const { result } = renderHook(() => useTrackerScope());
    expect(result.current.resolveIds(["t1", "t2", "t3"])).toEqual(["t1", "t3"]);
  });
});
