import { useEffect, useRef, useState } from "react";
import { Box, ChevronDown, Globe2, ShieldCheck, Tag, Users, type LucideIcon } from "lucide-react";
import type { DiscoveryDimensionDto } from "@/types/api";
import { cn } from "@/lib/utils";

interface DiscoverySummaryStripProps {
  products: readonly DiscoveryDimensionDto[];
  markets: readonly DiscoveryDimensionDto[];
  audiences: readonly DiscoveryDimensionDto[];
  topics: readonly DiscoveryDimensionDto[];
  trustSignals: readonly DiscoveryDimensionDto[];
}

/**
 * Discovery summary strip — five inline chips showing "N products · M
 * markets · K audiences · L topics · X trust signals" with a click-to-
 * popover listing the actual names. Purely informational read of the
 * workspace's discovery output; not a filter. Lives near the top of the
 * Workspace Overview so the user gets immediate visual confirmation
 * that the system remembers what they captured.
 */
export function DiscoverySummaryStrip({
  products,
  markets,
  audiences,
  topics,
  trustSignals,
}: DiscoverySummaryStripProps) {
  // Don't render anything when the workspace is empty — the rest of
  // the page already shows the "you don't have any tracked brands yet"
  // card in that case, so an additional empty strip would just add noise.
  const total =
    products.length + markets.length + audiences.length + topics.length + trustSignals.length;
  if (total === 0) return null;

  return (
    <div
      role="group"
      aria-label="Discovery summary"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500 shadow-sm"
    >
      <span className="font-medium text-neutral-600">Tracking</span>
      <DimensionChip icon={Box} singular="product" plural="products" items={products} />
      <DimensionChip icon={Globe2} singular="market" plural="markets" items={markets} />
      <DimensionChip icon={Users} singular="audience" plural="audiences" items={audiences} />
      <DimensionChip icon={Tag} singular="topic" plural="topics" items={topics} />
      <DimensionChip
        icon={ShieldCheck}
        singular="trust signal"
        plural="trust signals"
        items={trustSignals}
      />
    </div>
  );
}

interface DimensionChipProps {
  icon: LucideIcon;
  singular: string;
  plural: string;
  items: readonly DiscoveryDimensionDto[];
}

function DimensionChip({ icon: Icon, singular, plural, items }: DimensionChipProps) {
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

  const count = items.length;
  const label = count === 1 ? singular : plural;
  const disabled = count === 0;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup={disabled ? undefined : "listbox"}
        aria-expanded={disabled ? undefined : open}
        aria-label={`${count} ${label}`}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition",
          disabled
            ? "cursor-default border-neutral-100 bg-neutral-50 text-neutral-400"
            : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-primary-300 hover:bg-primary-50",
        )}
      >
        <Icon size={12} aria-hidden className="text-neutral-500" />
        <span className="tabular-nums">{count}</span>
        <span>{label}</span>
        {!disabled && (
          <ChevronDown size={11} aria-hidden className={cn("transition", open && "rotate-180")} />
        )}
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          aria-label={`${label} list`}
          className="absolute left-0 top-[calc(100%+4px)] z-30 max-h-80 w-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <ul className="py-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
