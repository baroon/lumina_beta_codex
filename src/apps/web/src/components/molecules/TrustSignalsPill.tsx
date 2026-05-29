import { useEffect, useRef, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustSignalsPillProps {
  /** Workspace trust-signal names (deduped). */
  allNames: readonly string[];
  ariaLabel?: string;
}

/**
 * Informational pill for the trust-signals dimension. Lives in the
 * unified filter bar next to the actual filter pills, but does NOT
 * filter — trust signals are scoring inputs, not prompt-tagging
 * dimensions (per the Phase-3 decision: `PromptTrustSignal` is
 * intentionally not in the schema). The pill click opens a popover
 * listing the workspace's trust signals so the user gets visibility
 * into what's been captured.
 */
export function TrustSignalsPill({ allNames, ariaLabel = "Trust signals" }: TrustSignalsPillProps) {
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

  const count = allNames.length;
  const empty = count === 0;
  const label = count === 1 ? "1 trust signal" : `${count} trust signals`;

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
          "inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50",
          empty && "cursor-default opacity-60 hover:bg-white",
        )}
      >
        <ShieldCheck size={14} className="text-neutral-500" aria-hidden />
        <span>{empty ? "No trust signals" : label}</span>
        {!empty && (
          <ChevronDown
            size={16}
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
          <ul className="max-h-72 overflow-y-auto py-1">
            {allNames.map((name) => (
              <li key={name} className="px-3 py-1.5 text-sm text-neutral-700">
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
