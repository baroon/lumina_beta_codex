import { useEffect, useRef, useState } from "react";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { DayPicker, type DateRange as DayPickerRange } from "react-day-picker";
import "react-day-picker/style.css";
import { format, startOfDay, subDays } from "date-fns";
import {
  defaultDateRangeSelection,
  triggerLabel,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import type { DateGranularity } from "@/components/molecules/DateGranularityToggle";
import { cn } from "@/lib/utils";

const PRESETS: ReadonlyArray<{ label: string; days: number }> = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 180 days", days: 180 },
  { label: "Last 365 days", days: 365 },
];

const GRANULARITY_OPTIONS: { value: DateGranularity; short: string; long: string }[] = [
  { value: "day", short: "D", long: "Daily" },
  { value: "week", short: "W", long: "Weekly" },
  { value: "month", short: "M", long: "Monthly" },
];

function granularityLabel(g: DateGranularity): string {
  return GRANULARITY_OPTIONS.find((o) => o.value === g)?.long ?? "Weekly";
}

interface DateRangeGranularityPickerProps {
  range: DateRangeSelection;
  onRangeChange: (next: DateRangeSelection) => void;
  granularity: DateGranularity;
  onGranularityChange: (next: DateGranularity) => void;
  ariaLabel?: string;
}

/**
 * Single trigger that combines the date range + chart granularity. Shrinks
 * the two stacked controls on the old Overview header into one compact pill
 * ("Last 30 days · Weekly"). Popover stacks the granularity segmented
 * control on top of the standard preset list + calendar.
 */
export function DateRangeGranularityPicker({
  range,
  onRangeChange,
  granularity,
  onGranularityChange,
  ariaLabel = "Date range and granularity",
}: DateRangeGranularityPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const calendarRange: DayPickerRange | undefined =
    range.kind === "custom"
      ? { from: range.from, to: range.to }
      : range.kind === "preset"
        ? {
            from: startOfDay(subDays(new Date(), range.days)),
            to: new Date(),
          }
        : undefined;

  function pickPreset(days: number) {
    onRangeChange({ kind: "preset", days });
    setOpen(false);
  }

  function pickAllTime() {
    onRangeChange({ kind: "all" });
    setOpen(false);
  }

  function reset() {
    onRangeChange(defaultDateRangeSelection());
    setOpen(false);
  }

  function handleCalendarSelect(r: DayPickerRange | undefined) {
    if (!r?.from || !r?.to) return;
    onRangeChange({ kind: "custom", from: r.from, to: r.to });
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
          "inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700",
          "shadow-sm transition hover:bg-neutral-50",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
        )}
      >
        <Calendar size={12} className="text-neutral-500" aria-hidden />
        <span>{triggerLabel(range)}</span>
        <span className="text-neutral-400">·</span>
        <span className="text-neutral-600">{granularityLabel(granularity)}</span>
        <ChevronDown size={12} className="text-neutral-500" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date range and granularity"
          className="absolute right-0 top-[calc(100%+4px)] z-30 w-[560px] rounded-lg border border-neutral-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Granularity
            </span>
            <div
              role="group"
              aria-label="Chart granularity"
              className="inline-flex rounded-md border border-neutral-300 bg-white p-0.5"
            >
              {GRANULARITY_OPTIONS.map((opt) => {
                const active = granularity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onGranularityChange(opt.value)}
                    aria-pressed={active}
                    aria-label={opt.long}
                    title={opt.long}
                    className={cn(
                      "rounded px-2 py-0.5 text-[11px] font-semibold transition",
                      active
                        ? "bg-primary-100 text-primary-700"
                        : "text-neutral-600 hover:bg-neutral-100",
                    )}
                  >
                    {opt.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex">
            <ul className="w-44 border-r border-neutral-100 py-2 text-sm" role="listbox">
              <li>
                <button
                  type="button"
                  onClick={pickAllTime}
                  role="option"
                  aria-selected={range.kind === "all"}
                  className={presetItemClasses(range.kind === "all")}
                >
                  <span>All time</span>
                  {range.kind === "all" && <Check size={14} aria-hidden />}
                </button>
              </li>
              {PRESETS.map((p) => {
                const selected = range.kind === "preset" && range.days === p.days;
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
                <span>{rangeFooterLabel(range)}</span>
                <span>{daysFooterLabel(range)}</span>
              </div>
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

function rangeFooterLabel(sel: DateRangeSelection): string {
  if (sel.kind === "custom") {
    return `${format(sel.from, "d MMM yyyy")} – ${format(sel.to, "d MMM yyyy")}`;
  }
  if (sel.kind === "preset") {
    const from = startOfDay(subDays(new Date(), sel.days));
    return `${format(from, "d MMM yyyy")} – now`;
  }
  return "All time";
}

function daysFooterLabel(sel: DateRangeSelection): string {
  if (sel.kind === "preset") return `${sel.days} days`;
  if (sel.kind === "all") return "—";
  const ms = sel.to.getTime() - sel.from.getTime();
  const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
  return `${days} days`;
}
