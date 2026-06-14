import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FiltersPopoverProps {
  /**
   * Number of currently-applied filters across the children. Drives the
   * count badge on the trigger and the "Clear all" link visibility.
   */
  activeCount: number;
  /** Called when the user clicks the "Clear all" link. */
  onClearAll?: () => void;
  /** Optional aria-label for the trigger button. */
  ariaLabel?: string;
  /**
   * Rows rendered inside the panel — typically `<FiltersPopoverRow>` entries
   * wrapping a selector. The panel does NOT auto-close on click within
   * itself so each child's own popover can open without conflict.
   */
  children: ReactNode;
}

/**
 * Compact "Filters" trigger + slide-down panel that consolidates several
 * filter selectors behind a single chip. Closes on ESC, the X button, or
 * a re-click of the trigger — NOT on outside click, so inner selectors'
 * popovers (each with their own click-outside logic) can open freely
 * without prematurely collapsing the parent.
 */
export function FiltersPopover({
  activeCount,
  onClearAll,
  ariaLabel = "Filters",
  children,
}: FiltersPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition",
          "shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
          activeCount > 0
            ? "border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
            : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
        )}
      >
        <SlidersHorizontal
          size={12}
          aria-hidden
          className={activeCount > 0 ? "text-primary-500" : "text-neutral-500"}
        />
        <span>Filters</span>
        {activeCount > 0 && (
          <span
            aria-label={`${activeCount} ${activeCount === 1 ? "filter" : "filters"} applied`}
            className="ml-0.5 inline-flex items-center rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-700"
          >
            {activeCount}
          </span>
        )}
        <ChevronDown size={12} className="text-neutral-500" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Discovery filters"
          className="absolute right-0 top-[calc(100%+4px)] z-30 w-80 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-700">
              <SlidersHorizontal size={12} className="text-primary-500" aria-hidden />
              Discovery filters
              {activeCount > 0 && (
                <span
                  aria-label={`${activeCount} ${activeCount === 1 ? "filter" : "filters"} applied`}
                  className="ml-0.5 inline-flex items-center rounded-full bg-primary-100 px-1.5 py-0 text-[10px] font-semibold tabular-nums text-primary-700"
                >
                  {activeCount}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {activeCount > 0 && onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-[11px] font-medium normal-case tracking-normal text-primary-600 hover:text-primary-700"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          </div>
          <div className="space-y-2 p-2">{children}</div>
        </div>
      )}
    </div>
  );
}

interface FiltersPopoverRowProps {
  label: string;
  /** When true, the row is highlighted as "currently filtering" — primary dot
   *  + darker label. */
  active?: boolean;
  /**
   * - "filter" (default): a normal multi-select row that drives an active filter.
   * - "reference": a visually demoted row for read-only / informational entries
   *   that look like filters but don't filter (e.g. trust signals). Renders on a
   *   subdued card with a "REFERENCE" caption, separated from real filters by a
   *   thin divider above.
   */
  variant?: "filter" | "reference";
  children: ReactNode;
}

/**
 * Labeled row inside a FiltersPopover. The label stacks above the
 * selector so each row reads cleanly even when the selector trigger
 * has its own count text.
 */
export function FiltersPopoverRow({
  label,
  active = false,
  variant = "filter",
  children,
}: FiltersPopoverRowProps) {
  if (variant === "reference") {
    return (
      <div className="mt-1 border-t border-neutral-100 pt-2">
        <div className="rounded-md bg-neutral-50 px-2.5 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Reference
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              {label}
            </span>
          </div>
          <div className="mt-1 flex items-center">{children}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-md px-2 py-1.5 transition-colors hover:bg-neutral-50/60">
      <div
        className={cn(
          "mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
          active ? "text-primary-700" : "text-neutral-600",
        )}
      >
        {active && (
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
        )}
        <span>{label}</span>
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}
