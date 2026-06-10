import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { Checkbox } from "@/components/atoms/checkbox";
import { Input } from "@/components/atoms/input";
import type { TrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";

export interface TrackerNode {
  /** Tracker ID. */
  id: string;
  /** Tracker display name. */
  name: string;
  /**
   * Whether this tracker has at least one completed scan. Trackers with
   * `false` render greyed with a "No scans yet" hint and remain checkable.
   */
  hasScans: boolean;
}

export interface BrandGroup {
  brandId: string;
  brandName: string;
  trackers: TrackerNode[];
}

interface TrackerSelectorProps {
  /** Brands grouping their trackers. */
  brands: readonly BrandGroup[];
  /** Current scope from `useTrackerScope`. */
  scope: TrackerScope;
  /** Setter from `useTrackerScope`. */
  onScopeChange: (next: TrackerScope) => void;
  /** Optional "Add brand" CTA when there are zero brands/trackers. */
  onAddBrand?: () => void;
  /** Wrapper className — useful for sidebar sizing. */
  className?: string;
  /** Trigger button extra className. */
  triggerClassName?: string;
}

// ---------------------------------------------------------------------------
// Pure selection helpers — exported for unit testing
// ---------------------------------------------------------------------------

/** Flat list of every tracker ID across all brands. */
export function allTrackerIds(brands: readonly BrandGroup[]): string[] {
  return brands.flatMap((b) => b.trackers.map((t) => t.id));
}

/** Is a specific tracker considered selected under the current scope? */
export function isTrackerSelected(scope: TrackerScope, trackerId: string): boolean {
  if (scope === "all") return true;
  return scope.includes(trackerId);
}

export type TriState = "checked" | "unchecked" | "indeterminate";

/** Compute the tri-state for the workspace ("All trackers") master checkbox. */
export function computeWorkspaceState(
  scope: TrackerScope,
  brands: readonly BrandGroup[],
): TriState {
  if (scope === "all") return "checked";
  if (scope.length === 0) return "unchecked";
  const total = allTrackerIds(brands).length;
  if (scope.length === total && total > 0) return "checked";
  return "indeterminate";
}

/** Compute the tri-state for one brand's parent checkbox. */
export function computeBrandState(scope: TrackerScope, brand: BrandGroup): TriState {
  const total = brand.trackers.length;
  if (total === 0) return "unchecked";
  if (scope === "all") return "checked";
  const selected = brand.trackers.filter((t) => scope.includes(t.id)).length;
  if (selected === 0) return "unchecked";
  if (selected === total) return "checked";
  return "indeterminate";
}

/** Toggle one individual tracker; canonicalizes to "all" when every tracker ends up selected. */
export function toggleTracker(
  scope: TrackerScope,
  trackerId: string,
  brands: readonly BrandGroup[],
): TrackerScope {
  const everyId = allTrackerIds(brands);
  if (scope === "all") {
    // Expand to explicit list minus this one.
    return everyId.filter((id) => id !== trackerId);
  }
  const has = scope.includes(trackerId);
  if (has) return scope.filter((id) => id !== trackerId);
  const next = [...scope, trackerId];
  return next.length === everyId.length ? "all" : next;
}

/** Toggle a whole brand's checkbox. */
export function toggleBrand(
  scope: TrackerScope,
  brandId: string,
  brands: readonly BrandGroup[],
): TrackerScope {
  const brand = brands.find((b) => b.brandId === brandId);
  if (!brand || brand.trackers.length === 0) return scope;
  const brandTrackerIds = brand.trackers.map((t) => t.id);
  const brandSet = new Set(brandTrackerIds);
  const everyId = allTrackerIds(brands);

  const state = computeBrandState(scope, brand);
  if (state === "checked") {
    // Currently all of this brand's trackers selected → uncheck them.
    if (scope === "all") {
      // Expand to other brands' trackers.
      return everyId.filter((id) => !brandSet.has(id));
    }
    return scope.filter((id) => !brandSet.has(id));
  }
  // Unchecked or indeterminate → select all in this brand (standard tri-state).
  if (scope === "all") return scope; // shouldn't happen (state would be "checked")
  const next = Array.from(new Set([...scope, ...brandTrackerIds]));
  return next.length === everyId.length ? "all" : next;
}

/** Toggle the workspace-level "All trackers" master checkbox. */
export function toggleWorkspace(scope: TrackerScope, brands: readonly BrandGroup[]): TrackerScope {
  const state = computeWorkspaceState(scope, brands);
  if (state === "checked") return [];
  // unchecked or indeterminate → select all.
  return "all";
}

/** Trigger pill label for the current scope. */
export function triggerLabel(scope: TrackerScope, brands: readonly BrandGroup[]): string {
  const all = allTrackerIds(brands);
  if (all.length === 0) return "No trackers yet";
  if (scope === "all") return `All trackers (${all.length})`;
  if (scope.length === 0) return "None selected";
  if (scope.length === 1) {
    const id = scope[0];
    for (const b of brands) {
      const t = b.trackers.find((x) => x.id === id);
      if (t) return t.name;
    }
    return "1 tracker";
  }
  return `${scope.length} of ${all.length} trackers`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Top-of-sidebar scope selector. Brands group their trackers in a checkbox
 * tree; multi-select with all-on by default. The selected scope drives the
 * URL `?trackers=` param via `useTrackerScope`. Always present in the
 * sidebar — inert on management pages where scope doesn't apply.
 */
export function TrackerSelector({
  brands,
  scope,
  onScopeChange,
  onAddBrand,
  className,
  triggerClassName,
}: TrackerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const label = useMemo(() => triggerLabel(scope, brands), [scope, brands]);
  const workspaceState = useMemo(() => computeWorkspaceState(scope, brands), [scope, brands]);
  const everyId = useMemo(() => allTrackerIds(brands), [brands]);

  const q = query.trim().toLowerCase();
  const visibleBrands = useMemo(() => {
    if (q === "") return brands;
    return brands
      .map((b) => {
        const brandMatches = b.brandName.toLowerCase().includes(q);
        const trackers = brandMatches
          ? b.trackers
          : b.trackers.filter((t) => t.name.toLowerCase().includes(q));
        return { ...b, trackers };
      })
      .filter((b) => b.trackers.length > 0);
  }, [q, brands]);

  return (
    <div ref={rootRef} className={cn("relative inline-block w-full text-left", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Tracker scope selector"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50",
          triggerClassName,
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-neutral-400 transition", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Tracker scope options"
          className="absolute z-30 mt-1 w-80 rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          {everyId.length === 0 ? (
            <EmptyState onAddBrand={onAddBrand} closeDropdown={() => setOpen(false)} />
          ) : (
            <>
              <div className="border-b border-neutral-100 px-2 py-1.5">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <Input
                    inputSize="sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search trackers…"
                    aria-label="Search trackers"
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="border-b border-neutral-100 bg-neutral-50/60 px-3 py-1.5">
                <CheckboxRow
                  state={workspaceState}
                  label={`All trackers (${everyId.length})`}
                  onToggle={() => onScopeChange(toggleWorkspace(scope, brands))}
                  emphasis="strong"
                />
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {visibleBrands.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-neutral-500">
                    No trackers match &ldquo;{query}&rdquo;.
                  </p>
                ) : (
                  visibleBrands.map((b) => (
                    <BrandBlock
                      key={b.brandId}
                      brand={b}
                      scope={scope}
                      onToggleBrand={() => onScopeChange(toggleBrand(scope, b.brandId, brands))}
                      onToggleTracker={(id) => onScopeChange(toggleTracker(scope, id, brands))}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({
  onAddBrand,
  closeDropdown,
}: {
  onAddBrand?: () => void;
  closeDropdown: () => void;
}) {
  return (
    <div className="p-4 text-center">
      <p className="text-xs text-neutral-600">No trackers yet.</p>
      {onAddBrand && (
        <button
          type="button"
          onClick={() => {
            onAddBrand();
            closeDropdown();
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add a brand
        </button>
      )}
    </div>
  );
}

interface BrandBlockProps {
  brand: BrandGroup;
  scope: TrackerScope;
  onToggleBrand: () => void;
  onToggleTracker: (id: string) => void;
}

function BrandBlock({ brand, scope, onToggleBrand, onToggleTracker }: BrandBlockProps) {
  const state = computeBrandState(scope, brand);
  return (
    <div className="px-1 pb-1.5">
      <div className="px-2 py-1">
        <CheckboxRow
          state={state}
          label={brand.brandName}
          onToggle={onToggleBrand}
          emphasis="strong"
        />
      </div>
      {/* Trackers indented under the brand with a thin vertical guide line
          on the left — gives the parent → child relationship a visual hook
          without leaning on icons or heavy indentation. */}
      <ul className="ml-[14px] border-l border-neutral-200 pl-2">
        {brand.trackers.map((t) => {
          const checked = isTrackerSelected(scope, t.id);
          return (
            <li key={t.id}>
              <TrackerRow tracker={t} checked={checked} onToggle={() => onToggleTracker(t.id)} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TrackerRow({
  tracker,
  checked,
  onToggle,
}: {
  tracker: TrackerNode;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-2 rounded px-2 py-0.5 hover:bg-neutral-50"
      title={tracker.name}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={tracker.name} />
      <span
        className={cn(
          "flex-1 truncate text-xs",
          tracker.hasScans ? "text-neutral-600" : "text-neutral-400 italic",
        )}
      >
        {tracker.name}
      </span>
      {!tracker.hasScans && (
        <span className="shrink-0 text-[10px] text-neutral-400" aria-label="No scans yet">
          No scans yet
        </span>
      )}
    </label>
  );
}

/**
 * Native checkbox doesn't expose `indeterminate` as a prop — only as a DOM
 * property. This wrapper bridges the gap and keeps the visual + ARIA state
 * in sync for tri-state parents.
 */
function CheckboxRow({
  state,
  label,
  onToggle,
  emphasis = "normal",
}: {
  state: TriState;
  label: string;
  onToggle: () => void;
  /** Visual weight — "strong" for brand rows + master, "normal" otherwise. */
  emphasis?: "normal" | "strong";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = state === "indeterminate";
  }, [state]);
  return (
    <label
      className="flex cursor-pointer items-center gap-2 rounded hover:bg-neutral-50"
      title={label}
    >
      <Checkbox
        ref={inputRef}
        checked={state === "checked"}
        aria-checked={state === "indeterminate" ? "mixed" : state === "checked"}
        onCheckedChange={onToggle}
        aria-label={label}
      />
      <span
        className={cn(
          "flex-1 truncate text-xs",
          emphasis === "strong" ? "font-semibold text-neutral-900" : "text-neutral-700",
        )}
      >
        {label}
      </span>
    </label>
  );
}
