import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Optional leading identity icon, rendered in a subtle chip. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Right-aligned informational content (e.g., a count). */
  meta?: ReactNode;
  /** Right-aligned controls (e.g., a refresh button). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Linear-style section header: an optional icon chip, a tight-tracked title with
 * an optional muted description, and right-aligned meta/actions slots.
 */
export function SectionHeader({
  icon: Icon,
  title,
  description,
  meta,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {Icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold tracking-tight text-neutral-900">
          {title}
        </h3>
        {description && <p className="truncate text-xs text-neutral-500">{description}</p>}
      </div>
      {(meta || actions) && (
        <div className="flex shrink-0 items-center gap-2">
          {meta}
          {actions}
        </div>
      )}
    </div>
  );
}
