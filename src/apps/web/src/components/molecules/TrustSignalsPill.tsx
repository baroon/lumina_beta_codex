import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandedDimensionGroupDto } from "@/types/api";

interface TrustSignalsPillProps {
  /**
   * Workspace trust signals grouped per brand. The popover lists each
   * brand as a section so the user can see which signals belong to
   * which brand; the trigger label shows the workspace-wide unique
   * count.
   */
  trustSignalsByBrand: readonly BrandedDimensionGroupDto[];
  ariaLabel?: string;
}

/**
 * Informational pill for the trust-signals dimension. Lives in the
 * unified filter bar next to the actual filter pills, but does NOT
 * filter — trust signals are scoring inputs, not prompt-tagging
 * dimensions (per the Phase-3 decision: `PromptTrustSignal` is
 * intentionally not in the schema). The pill click opens a popover
 * that lists the workspace's trust signals grouped per brand.
 */
export function TrustSignalsPill({
  trustSignalsByBrand,
  ariaLabel = "Trust signals",
}: TrustSignalsPillProps) {
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

  // Trigger label shows the workspace-wide unique count (a signal
  // appearing under two brands counts once), matching how the dropdown
  // selectors phrase their totals.
  const uniqueCount = useMemo(() => {
    const set = new Set<string>();
    for (const g of trustSignalsByBrand) for (const i of g.items) set.add(i.name);
    return set.size;
  }, [trustSignalsByBrand]);
  const empty = uniqueCount === 0;
  const label = uniqueCount === 1 ? "1 trust signal" : `${uniqueCount} trust signals`;

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => !empty && setOpen((o) => !o)}
        disabled={empty}
        aria-haspopup={empty ? undefined : "dialog"}
        aria-expanded={empty ? undefined : open}
        aria-label={ariaLabel}
        title="Workspace trust signals (informational, not a filter)"
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-50",
          empty && "cursor-default opacity-60 hover:bg-white",
        )}
      >
        <ShieldCheck size={12} className="text-neutral-400" aria-hidden />
        <span>{empty ? "No trust signals" : label}</span>
        {!empty && (
          <ChevronDown
            size={12}
            className={cn("text-neutral-400 transition", open && "rotate-180")}
            aria-hidden
          />
        )}
      </button>

      {open && !empty && (
        <div
          role="dialog"
          aria-label={`${ariaLabel} list`}
          className="absolute z-30 mt-1 w-64 rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <p className="border-b border-neutral-100 px-3 py-2 text-[11px] uppercase tracking-wide text-neutral-500">
            Informational only
          </p>
          <div className="max-h-72 overflow-y-auto">
            {trustSignalsByBrand.map((group) => (
              <div key={group.brandId} className="py-1">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  {group.brandName}
                </div>
                <ul role="group" aria-label={group.brandName}>
                  {group.items.map((item) => (
                    <li
                      key={`${group.brandId}:${item.id}`}
                      className="px-3 py-1.5 text-sm text-neutral-700"
                    >
                      {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
