import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Globe2 } from "lucide-react";
import { Checkbox } from "@/components/atoms/checkbox";
import { Input } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

interface MarketSelectorProps {
  /** Market names in the workspace, already deduped case-insensitively. */
  allMarketNames: readonly string[];
  /** Currently-selected market names. Empty array = no filter ("All markets"). */
  selectedNames: readonly string[];
  onChange: (next: string[]) => void;
  /** Per-market mention count keyed by name. Optional. */
  countsByName?: Readonly<Record<string, number>>;
  ariaLabel?: string;
}

/**
 * Dropdown chip for filtering the Workspace Overview by Market. Same
 * structure as TopicSelector / ProductSelector — multi-select with
 * substring search and an inline mention-count chip per row. Empty
 * array sentinel reads as "All markets". Threads as `?marketNames=`
 * through the three overview endpoints.
 */
export function MarketSelector({
  allMarketNames,
  selectedNames,
  onChange,
  countsByName,
  ariaLabel = "Market selector",
}: MarketSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  const sorted = useMemo(
    () => [...allMarketNames].sort((a, b) => a.localeCompare(b)),
    [allMarketNames],
  );
  const q = query.trim().toLowerCase();
  const visible = q === "" ? sorted : sorted.filter((n) => n.toLowerCase().includes(q));

  const total = sorted.length;
  const selected = selectedNames.length;
  const allSelected = selected === 0 || selected === total;
  const buttonLabel = allSelected ? `${total} markets` : `${selected} of ${total} markets`;

  function toggle(name: string) {
    const base = selectedNames.length === 0 ? sorted : selectedNames;
    if (base.includes(name)) {
      const next = base.filter((n) => n !== name);
      onChange(next.length === 0 ? [] : next);
    } else {
      const next = [...base, name];
      onChange(next.length === total ? [] : next);
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        disabled={total === 0}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50",
          total === 0 && "cursor-default opacity-60 hover:bg-white",
        )}
      >
        <Globe2 size={14} className="text-neutral-500" aria-hidden />
        <span>{total === 0 ? "No markets" : buttonLabel}</span>
        {total > 0 && (
          <ChevronDown
            className={cn("h-4 w-4 text-neutral-400 transition", open && "rotate-180")}
            aria-hidden="true"
          />
        )}
      </button>

      {open && total > 0 && (
        <div
          role="listbox"
          aria-label={`${ariaLabel} options`}
          className="absolute z-30 mt-1 w-72 rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <div className="border-b border-neutral-100 p-2">
            <Input
              inputSize="sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets…"
              aria-label="Search markets"
            />
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <span>Markets</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-medium normal-case tracking-normal text-primary-600 hover:text-primary-700"
            >
              {allSelected ? "Clear" : "Select all"}
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-neutral-500">
                No markets match &ldquo;{query}&rdquo;.
              </li>
            ) : (
              visible.map((name) => {
                const checked = selectedNames.length === 0 ? true : selectedNames.includes(name);
                return (
                  <li key={name}>
                    <label className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(name)}
                        aria-label={name}
                        checkboxSize="sm"
                      />
                      <span className="flex-1 truncate font-medium text-neutral-900">{name}</span>
                      {countsByName && name in countsByName && (
                        <MarketMentionChip count={countsByName[name]} />
                      )}
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function MarketMentionChip({ count }: { count: number }) {
  const empty = count === 0;
  return (
    <span
      title={`${count} ${count === 1 ? "mention" : "mentions"} in this window`}
      className={cn(
        "ml-1 inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        empty ? "bg-neutral-100 text-neutral-400" : "bg-primary-50 text-primary-700",
      )}
    >
      {count}
    </span>
  );
}
