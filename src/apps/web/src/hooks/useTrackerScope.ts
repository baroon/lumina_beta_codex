import { useCallback, useEffect, useState } from "react";

/** Either `"all"` (no filter) or an explicit list of tracker IDs. */
export type TrackerScope = "all" | string[];

const PARAM_NAME = "trackers";
/**
 * Browser event fired by `setScope` so other `useTrackerScope` instances
 * on the same page (e.g. the TrackerSelector pill in the sidebar + the
 * analytical page consuming the scope) stay in lockstep without prop
 * drilling. The native `popstate` event only fires on back/forward — we
 * need our own bus for programmatic changes.
 */
const SCOPE_CHANGE_EVENT = "lumina:tracker-scope-change";

function readScopeFromUrl(): TrackerScope {
  if (typeof window === "undefined") return "all";
  const raw = new URLSearchParams(window.location.search).get(PARAM_NAME);
  // Param absent: default scope = all trackers. Param present (even empty):
  // user has expressed an explicit subset — including the empty case where
  // they've actively deselected everything. The distinction matters for
  // tri-state checkbox UX in the selector.
  if (raw === null) return "all";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function writeScopeToUrl(scope: TrackerScope) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (scope === "all") {
    // Remove the param entirely — its absence is the canonical "all" state.
    params.delete(PARAM_NAME);
  } else {
    // Explicit subset (possibly empty array → empty param value).
    params.set(PARAM_NAME, scope.join(","));
  }
  const search = params.toString();
  const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  // replaceState — back-button leaves the page, not unwinds scope clicks.
  window.history.replaceState(null, "", next);
}

interface UseTrackerScopeReturn {
  /** Current scope from the URL — `"all"` when no filter is active. */
  scope: TrackerScope;
  /** Convenience flag — equivalent to `scope === "all"`. */
  isAll: boolean;
  /** Write a new scope. Updates URL via replaceState; broadcasts to peers. */
  setScope: (next: TrackerScope) => void;
  /**
   * Resolve scope to a concrete ID list. Pass the full set of available
   * tracker IDs as `allTrackerIds`; the helper returns those when scope is
   * `"all"`, or the explicit subset otherwise. Useful for data hooks that
   * need a definite list to filter on.
   */
  resolveIds: (allTrackerIds: readonly string[]) => string[];
}

/**
 * Reads/writes the analytics tracker filter from the URL `?trackers=` query
 * param. Returns `"all"` when no param is set — analytical pages treat
 * that as "show every tracker".
 *
 * The setter uses `replaceState` so the user's back button leaves the page
 * rather than unwinding each scope change, and other query params (e.g.
 * `?tab=` on the tracker hub) are preserved.
 *
 * Multiple instances on the same page stay synchronized via a small
 * window-level event bus — when the selector writes, the analytical page
 * reading from `useTrackerScope` re-renders automatically.
 */
export function useTrackerScope(): UseTrackerScopeReturn {
  const [scope, setScopeState] = useState<TrackerScope>(readScopeFromUrl);

  const setScope = useCallback((next: TrackerScope) => {
    writeScopeToUrl(next);
    setScopeState(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(SCOPE_CHANGE_EVENT));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function sync() {
      setScopeState(readScopeFromUrl());
    }
    window.addEventListener("popstate", sync);
    window.addEventListener(SCOPE_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(SCOPE_CHANGE_EVENT, sync);
    };
  }, []);

  const resolveIds = useCallback(
    (allTrackerIds: readonly string[]): string[] => (scope === "all" ? [...allTrackerIds] : scope),
    [scope],
  );

  return {
    scope,
    isAll: scope === "all",
    setScope,
    resolveIds,
  };
}
