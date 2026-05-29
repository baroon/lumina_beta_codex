import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { Checkbox } from "@/components/atoms/checkbox";
import { VISIBILITY_LENSES } from "@/content/lenses";
import { cn } from "@/lib/utils";

interface LensSelectorProps {
  /** Currently-selected lens codes. Empty array = no filter = "All lenses". */
  selectedCodes: readonly string[];
  /** Called with the new selected-codes set when the user toggles. */
  onChange: (next: string[]) => void;
  /**
   * Optional per-lens mention count for the current window. Rendered as
   * a small inline chip on each row so the user can spot empty lenses
   * before toggling. Keyed by lens code; missing entries fall back to
   * "no chip". Stays stable across lens toggles (the BE endpoint that
   * supplies this is deliberately scoped to date + workspace only).
   */
  countsByCode?: Readonly<Record<string, number>>;
  /** Optional aria-label / data-testid base. */
  ariaLabel?: string;
}

/**
 * Dropdown chip for filtering the Workspace Overview by Visibility Lens.
 * Multi-select with checkboxes; closed-trigger reads "All lenses" /
 * "N of 6 lenses". Visually consistent with BrandSelector + DateRangePicker
 * so the three controls read as one row.
 *
 * Currently FE-only state — the data fetches don't yet honor the
 * selection. Once the form direction is settled (dropdown vs pill row)
 * we'll thread `?lensCodes=` through the overview endpoints.
 */
export function LensSelector({
  selectedCodes,
  onChange,
  countsByCode,
  ariaLabel = "Visibility lens selector",
}: LensSelectorProps) {
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

  const total = VISIBILITY_LENSES.length;
  const selected = selectedCodes.length;
  const allSelected = selected === 0 || selected === total;

  const buttonLabel = allSelected ? "All lenses" : `${selected} of ${total} lenses`;

  function toggle(code: string) {
    // Treat the empty "no filter" state as "all selected" — toggling
    // off a single lens from there leaves the other five selected.
    const base = selectedCodes.length === 0 ? VISIBILITY_LENSES.map((l) => l.code) : selectedCodes;
    if (base.includes(code)) {
      const next = base.filter((c) => c !== code);
      // Collapse back to "no filter" when none remain selected so
      // downstream callers see the same shape as the default.
      onChange(next.length === 0 ? [] : next);
    } else {
      const next = [...base, code];
      // Collapse to "no filter" once every lens is selected (same UX as
      // BrandSelector's "All brands" sentinel).
      onChange(next.length === total ? [] : next);
    }
  }

  function selectAll() {
    onChange([]);
  }

  function clear() {
    // Single-lens "Clear" leaves nothing selected which would render no
    // data — flip to "All" instead, matching the BrandSelector behavior.
    onChange([]);
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50",
        )}
      >
        <Eye size={14} className="text-neutral-500" aria-hidden />
        <span>{buttonLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-neutral-400 transition", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={`${ariaLabel} options`}
          className="absolute z-30 mt-1 w-72 rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <span>Visibility lenses</span>
            <button
              type="button"
              onClick={allSelected ? clear : selectAll}
              className="text-[11px] font-medium normal-case tracking-normal text-primary-600 hover:text-primary-700"
            >
              {allSelected ? "Clear" : "Select all"}
            </button>
          </div>
          <ul className="py-1">
            {VISIBILITY_LENSES.map((lens) => {
              // The default empty-array sentinel reads as "everything selected".
              const checked = selectedCodes.length === 0 ? true : selectedCodes.includes(lens.code);
              return (
                <li key={lens.code}>
                  <label className="flex w-full cursor-pointer items-start gap-2 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(lens.code)}
                      aria-label={lens.name}
                      checkboxSize="sm"
                      className="mt-0.5"
                    />
                    <span className="flex-1">
                      <span className="block font-medium text-neutral-900">{lens.name}</span>
                      <span className="block text-[11px] text-neutral-500">{lens.description}</span>
                    </span>
                    {countsByCode && lens.code in countsByCode && (
                      <LensMentionChip count={countsByCode[lens.code]} />
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Compact pill showing how many mentions live in a given lens for the
 * current window. Zero is rendered muted (with the title text doing the
 * "empty" heavy lifting) so it stands out as "toggling won't move
 * mention-driven charts".
 */
function LensMentionChip({ count }: { count: number }) {
  const empty = count === 0;
  return (
    <span
      title={`${count} ${count === 1 ? "mention" : "mentions"} in this window`}
      className={cn(
        "ml-1 mt-0.5 inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        empty ? "bg-neutral-100 text-neutral-400" : "bg-primary-50 text-primary-700",
      )}
    >
      {count}
    </span>
  );
}
