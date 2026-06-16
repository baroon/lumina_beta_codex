import { cn } from "@/lib/utils";

export type EntityScope = "all" | "tracked" | "top5";

interface EntityScopeToggleProps {
  value: EntityScope;
  onChange: (next: EntityScope) => void;
  ariaLabel?: string;
}

const OPTIONS: { value: EntityScope; label: string; title: string }[] = [
  { value: "all", label: "All", title: "All tracked brands + competitors" },
  { value: "tracked", label: "Tracked", title: "Tracked brands only" },
  { value: "top5", label: "Top 5", title: "Top 5 by mention count" },
];

/**
 * Segmented chip that scopes which entities are highlighted across the
 * Workspace Overview's charts and tables. Replaces the heavier multi-
 * select BrandSelector now that the sidebar tracker scope owns the
 * brand-level filter — this control is just for picking the entity slice
 * (all / tracked-only / top 5 by mention count). Caller derives the
 * actual selectedKeys list from this value + the workspace data.
 */
export function EntityScopeToggle({
  value,
  onChange,
  ariaLabel = "Entity scope",
}: EntityScopeToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-md border border-neutral-300 bg-white p-[1px] shadow-sm"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={opt.title}
            title={opt.title}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold transition",
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
