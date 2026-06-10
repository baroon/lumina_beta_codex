import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { cn } from "@/lib/utils";

interface ComingSoonProps {
  /** Page title shown beneath the icon. */
  title: string;
  /** One-line description of what will live here. */
  description?: string;
  /** Optional lucide icon rendered in a soft primary-tinted badge. */
  icon?: LucideIcon;
  /** Optional "BETA" pill rendered next to the title. */
  beta?: boolean;
  /** Wrapper className. */
  className?: string;
}

/**
 * Placeholder body for routes that are reachable but not yet built out.
 * Used during navigation IA rollout — routes land in the router before
 * their screens exist, so direct-URL hits and sidebar links don't 404.
 * The molecule keeps the layout consistent across the placeholder set so
 * the gap reads as "in flight" rather than "broken".
 */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  beta = false,
  className,
}: ComingSoonProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 p-10 text-center",
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden
          className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-600"
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {beta && (
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            Beta
          </Badge>
        )}
      </div>
      {description && <p className="mt-1 max-w-sm text-xs text-neutral-500">{description}</p>}
      <p className="mt-4 text-[11px] uppercase tracking-wide text-neutral-400">Coming soon</p>
    </div>
  );
}
