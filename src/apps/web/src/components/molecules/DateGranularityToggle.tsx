import { cn } from "@/lib/utils";

export type DateGranularity = "day" | "week" | "month";

interface DateGranularityToggleProps {
  value: DateGranularity;
  onChange: (next: DateGranularity) => void;
  /** Optional aria-label for the group. */
  ariaLabel?: string;
}

const OPTIONS: { value: DateGranularity; label: string; title: string }[] = [
  { value: "day", label: "D", title: "Day" },
  { value: "week", label: "W", title: "Week" },
  { value: "month", label: "M", title: "Month" },
];

/**
 * Day / Week / Month aggregation toggle for the overview's chart
 * granularity. Currently a presentational control — the back end still
 * returns scan-level points; we'll wire bucketing through once a chart
 * actually needs it. Lives alongside the DateRangePicker in the top
 * row of the controls.
 */
export function DateGranularityToggle({
  value,
  onChange,
  ariaLabel = "Chart granularity",
}: DateGranularityToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex shrink-0 rounded-md border border-neutral-300 bg-white p-0.5 shadow-sm"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            title={opt.title}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-semibold transition",
              active ? "bg-primary-100 text-primary-700" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
