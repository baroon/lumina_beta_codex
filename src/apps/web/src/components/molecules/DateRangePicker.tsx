import { useEffect, useRef, useState } from "react";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { DayPicker, type DateRange as DayPickerRange } from "react-day-picker";
import "react-day-picker/style.css";
import { format, startOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Three flavors of selection — preset rolling window, custom range, or
 * "all time" (no lower bound). Modeled as a tagged union so the picker
 * (and the React Query key) doesn't drift when the rolling preset's
 * `Date.now()` snapshot changes between renders.
 */
export type DateRangeSelection =
  | { kind: "preset"; days: number }
  | { kind: "custom"; from: Date; to: Date }
  | { kind: "all" };

/** Effective window the resolver hands to API callers. */
export interface DateRange {
  from: Date | null;
  to: Date | null;
}

const PRESETS: ReadonlyArray<{ label: string; days: number }> = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 180 days", days: 180 },
  { label: "Last 365 days", days: 365 },
];

const DEFAULT_SELECTION: DateRangeSelection = { kind: "preset", days: 30 };

/** Default factory — exported so consumers can seed `useState` consistently. */
export function defaultDateRangeSelection(): DateRangeSelection {
  return DEFAULT_SELECTION;
}

/**
 * Resolve a selection into a concrete `{from, to}` pair used to build the
 * `?from=&to=` query. Preset windows always snap to "now" at resolve time
 * so a stale render doesn't shift the upper bound by a few minutes.
 */
export function resolveDateRange(sel: DateRangeSelection): DateRange {
  switch (sel.kind) {
    case "preset":
      return { from: startOfDay(subDays(new Date(), sel.days)), to: null };
    case "custom":
      return { from: sel.from, to: sel.to };
    case "all":
      return { from: null, to: null };
  }
}

/**
 * Stable React-Query key fragment. The picker state (not the resolved
 * Date pair) drives identity so a rolling-window preset doesn't burst
 * the cache every render.
 */
export function serializeDateRangeSelection(sel: DateRangeSelection): string {
  switch (sel.kind) {
    case "preset":
      return `preset:${sel.days}`;
    case "custom":
      return `custom:${sel.from.toISOString()}:${sel.to.toISOString()}`;
    case "all":
      return "all";
  }
}

interface DateRangePickerProps {
  value: DateRangeSelection;
  onChange: (next: DateRangeSelection) => void;
  /** Optional aria-label / data-testid base. */
  ariaLabel?: string;
}

/**
 * Top-bar date-range picker — bordered pill trigger plus a popover with a
 * preset list on the left and a `react-day-picker` range calendar on the
 * right. State is owned by the caller (controlled component); the molecule
 * is presentational + click-outside-aware.
 *
 * Matches the visual language of `BrandSelector` so the two read as part
 * of the same control row.
 */
export function DateRangePicker({
  value,
  onChange,
  ariaLabel = "Date range picker",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on click outside.
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

  // For the calendar, derive a DayPicker-shaped range from the current
  // selection so the in-popover state stays in sync as the user clicks
  // presets vs the calendar grid.
  const calendarRange: DayPickerRange | undefined =
    value.kind === "custom"
      ? { from: value.from, to: value.to }
      : value.kind === "preset"
        ? {
            from: startOfDay(subDays(new Date(), value.days)),
            to: new Date(),
          }
        : undefined;

  function pickPreset(days: number) {
    onChange({ kind: "preset", days });
    setOpen(false);
  }

  function pickAllTime() {
    onChange({ kind: "all" });
    setOpen(false);
  }

  function reset() {
    onChange(DEFAULT_SELECTION);
    setOpen(false);
  }

  function handleCalendarSelect(range: DayPickerRange | undefined) {
    if (!range?.from || !range?.to) return; // partial — wait for full range
    onChange({ kind: "custom", from: range.from, to: range.to });
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm",
          "shadow-sm transition hover:bg-neutral-50",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
        )}
      >
        <Calendar size={14} className="text-neutral-500" aria-hidden />
        <span className="font-medium text-neutral-700">{triggerLabel(value)}</span>
        <ChevronDown size={14} className="text-neutral-500" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date range"
          className="absolute left-0 top-[calc(100%+4px)] z-30 flex w-[560px] rounded-lg border border-neutral-200 bg-white shadow-xl"
        >
          <ul className="w-44 border-r border-neutral-100 py-2 text-sm" role="listbox">
            <li>
              <button
                type="button"
                onClick={pickAllTime}
                role="option"
                aria-selected={value.kind === "all"}
                className={presetItemClasses(value.kind === "all")}
              >
                <span>All time</span>
                {value.kind === "all" && <Check size={14} aria-hidden />}
              </button>
            </li>
            {PRESETS.map((p) => {
              const selected = value.kind === "preset" && value.days === p.days;
              return (
                <li key={p.days}>
                  <button
                    type="button"
                    onClick={() => pickPreset(p.days)}
                    role="option"
                    aria-selected={selected}
                    className={presetItemClasses(selected)}
                  >
                    <span>{p.label}</span>
                    {selected && <Check size={14} aria-hidden />}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={reset}
                className="mx-3 mt-1 block w-[calc(100%-1.5rem)] rounded px-2 py-1.5 text-left text-xs text-neutral-500 hover:bg-neutral-100"
              >
                Reset
              </button>
            </li>
          </ul>

          <div className="flex-1 p-3">
            <DayPicker
              mode="range"
              numberOfMonths={1}
              selected={calendarRange}
              onSelect={handleCalendarSelect}
              showOutsideDays
            />
            <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500">
              <span>{rangeFooterLabel(value)}</span>
              <span>{daysFooterLabel(value)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function presetItemClasses(active: boolean) {
  return cn(
    "flex w-full items-center justify-between px-4 py-1.5 text-left transition",
    active ? "bg-primary-50 font-medium text-primary-700" : "text-neutral-700 hover:bg-neutral-50",
  );
}

/** Label shown on the closed trigger button. */
export function triggerLabel(sel: DateRangeSelection): string {
  if (sel.kind === "preset")
    return PRESETS.find((p) => p.days === sel.days)?.label ?? `Last ${sel.days} days`;
  if (sel.kind === "all") return "All time";
  const fromYear = sel.from.getFullYear();
  const toYear = sel.to.getFullYear();
  const sameYear = fromYear === toYear;
  return sameYear
    ? `${format(sel.from, "d MMM")} – ${format(sel.to, "d MMM yyyy")}`
    : `${format(sel.from, "d MMM yyyy")} – ${format(sel.to, "d MMM yyyy")}`;
}

function rangeFooterLabel(sel: DateRangeSelection): string {
  const { from, to } = resolveDateRange(sel);
  if (from && to) return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
  if (from) return `${format(from, "d MMM yyyy")} – now`;
  return "All time";
}

function daysFooterLabel(sel: DateRangeSelection): string {
  if (sel.kind === "preset") return `${sel.days} days`;
  if (sel.kind === "all") return "—";
  const ms = sel.to.getTime() - sel.from.getTime();
  const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
  return `${days} days`;
}
