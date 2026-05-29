import { Eye } from "lucide-react";
import { VISIBILITY_LENSES } from "@/content/lenses";
import { cn } from "@/lib/utils";

interface LensChipRowProps {
  /** Currently-selected lens codes. Empty array = no filter = all lenses on. */
  selectedCodes: readonly string[];
  /** Called with the next selected-codes set when the user toggles a chip. */
  onChange: (next: string[]) => void;
  /** Optional per-lens mention count keyed by lens code. */
  countsByCode?: Readonly<Record<string, number>>;
}

/**
 * One toggle chip per Visibility Lens, rendered inline. Replaces the
 * single "N lenses" dropdown — each chip shows the lens name + a
 * mention-count badge and toggles include/exclude in place. Same
 * empty-array sentinel as the dropdown form ("no filter = all
 * selected") so the BE call shape is unchanged.
 */
export function LensChipRow({ selectedCodes, onChange, countsByCode }: LensChipRowProps) {
  const allCodes = VISIBILITY_LENSES.map((l) => l.code);
  const allSelected = selectedCodes.length === 0;

  function isSelected(code: string): boolean {
    return allSelected || selectedCodes.includes(code);
  }

  function toggle(code: string) {
    const base = allSelected ? allCodes : Array.from(selectedCodes);
    if (base.includes(code)) {
      const next = base.filter((c) => c !== code);
      onChange(next);
    } else {
      const next = [...base, code];
      onChange(next.length === allCodes.length ? [] : next);
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Visibility lens filter"
    >
      {VISIBILITY_LENSES.map((lens) => (
        <LensChip
          key={lens.code}
          name={lens.name}
          selected={isSelected(lens.code)}
          count={countsByCode?.[lens.code]}
          onClick={() => toggle(lens.code)}
          ariaPressed={isSelected(lens.code)}
        />
      ))}
    </div>
  );
}

interface LensChipProps {
  name: string;
  selected: boolean;
  count?: number;
  onClick: () => void;
  ariaPressed: boolean;
}

function LensChip({ name, selected, count, onClick, ariaPressed }: LensChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      aria-label={name}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
        selected
          ? "border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
          : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50",
      )}
    >
      <Eye size={12} aria-hidden className={selected ? "text-primary-500" : "text-neutral-400"} />
      <span>{name}</span>
      {count !== undefined && <LensCountBadge count={count} selected={selected} />}
    </button>
  );
}

function LensCountBadge({ count, selected }: { count: number; selected: boolean }) {
  const empty = count === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        empty
          ? "bg-neutral-100 text-neutral-400"
          : selected
            ? "bg-primary-100 text-primary-700"
            : "bg-neutral-100 text-neutral-600",
      )}
      aria-label={`${count} ${count === 1 ? "mention" : "mentions"}`}
    >
      {count}
    </span>
  );
}
