import { cn } from "@/lib/utils";

// Friendly display labels for AI platform codes. Falls back to the raw
// code for any platform we don't have a label for yet (e.g. a future
// provider added on the BE before the FE catalog catches up).
export const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  openai: "ChatGPT",
  "chatgpt-search": "ChatGPT Search",
  gemini: "Gemini",
  claude: "Claude",
  perplexity: "Perplexity",
  grok: "Grok",
};

export function platformLabel(code: string): string {
  return PLATFORM_LABELS[code] ?? code;
}

// Canonical order of the dominantSentiment values from the BE Sentiment
// enum. Drives the Sentiment chip-filter row so the user sees the
// values in a stable gradient (positive → negative) regardless of
// which subset is present in the current scope.
export const SENTIMENT_ORDER: readonly string[] = [
  "Positive",
  "Neutral",
  "Mixed",
  "Negative",
  "Unknown",
];

/**
 * Inline chip multi-select with the LensChipRow UX:
 *   - Empty `selected` = "no narrowing": every chip visually pressed.
 *   - Clicking a chip when nothing is explicitly selected narrows to
 *     just that chip.
 *   - Subsequent clicks ADD to the selection (multi-select).
 *   - Clicking an already-selected chip is a no-op (don't-unselect rule;
 *     the Clear link below resets).
 *
 * Used by both `/prompts` (Models + Sentiment rows in the FiltersPopover)
 * and `/overview` (same two rows). The empty-selection / don't-unselect
 * semantics intentionally match `LensChipRow` on the Workspace Overview's
 * lens-chip strip so filter behavior reads consistently across the app.
 */
interface InlineChipFilterProps {
  /** Stable iteration order of values to render as chips. */
  available: readonly string[];
  /** Currently selected values (case-sensitive). Empty = "no narrowing". */
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /** Optional value→label transform. Defaults to identity. */
  labelFor?: (value: string) => string;
  /** Message rendered when `available` is empty. */
  emptyLabel: string;
  /** Aria-label prefix on each chip (e.g. "Filter by"). */
  ariaLabelPrefix?: string;
  /**
   * Optional per-value count map. When provided, each chip gets a small
   * trailing badge with the count (styled to match the `MentionChip` in
   * TopicSelector etc.). A value with count 0 renders the badge in a
   * muted neutral tint so empty entries read as "nothing in scope".
   */
  countsByValue?: Readonly<Record<string, number>>;
}

export function InlineChipFilter({
  available,
  selected,
  onChange,
  labelFor = (v) => v,
  emptyLabel,
  ariaLabelPrefix = "Filter by",
  countsByValue,
}: InlineChipFilterProps) {
  if (available.length === 0) {
    return <span className="text-xs text-neutral-400">{emptyLabel}</span>;
  }
  const selectedSet = new Set(selected);
  const allSelectedVisually = selected.length === 0;
  function add(value: string) {
    if (selectedSet.has(value)) return; // explicit don't-unselect rule
    onChange([...selected, value]);
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {available.map((value) => {
        const label = labelFor(value);
        const pressed = allSelectedVisually || selectedSet.has(value);
        const count = countsByValue?.[value];
        return (
          <button
            key={value}
            type="button"
            onClick={() => add(value)}
            aria-pressed={pressed}
            aria-label={`${ariaLabelPrefix} ${label}`}
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition",
              pressed
                ? "border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            <span>{label}</span>
            {count !== undefined && (
              <span
                aria-hidden
                title={`${count} in this window`}
                className={cn(
                  "ml-1 inline-flex shrink-0 items-center rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                  count === 0
                    ? "bg-neutral-100 text-neutral-400"
                    : pressed
                      ? "bg-primary-100 text-primary-700"
                      : "bg-neutral-100 text-neutral-600",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
      {!allSelectedVisually && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="ml-1 text-[11px] font-medium text-primary-600 hover:text-primary-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}
