import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/atoms/skeleton";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  /**
   * Display label. Omit (undefined) to render a skeleton segment while the
   * parent data is still loading — the breadcrumb keeps its layout instead
   * of reflowing once names arrive.
   */
  label?: string;
  /**
   * TanStack route pattern, e.g. `"/brands/$brandId/profile"`. Cast to
   * `never` internally because the molecule is generic — consumers lose
   * route-string type safety here in exchange for a uniform API. The last
   * item in the trail ignores `to` and renders as plain current-page text.
   */
  to?: string;
  /** Route params for dynamic patterns (e.g. `{ brandId: "..." }`). */
  params?: Record<string, unknown>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Compact navigation breadcrumb — `Workspace › Brand › Tracker › Scan`.
 * Used on management pages and scan detail pages once they're wired up.
 * Items with `to` render as TanStack `Link`s; items without `to` (and the
 * last item) render as plain text with `aria-current="page"` on the tail.
 * Items with `label === undefined` render a small skeleton segment so the
 * breadcrumb doesn't reflow when async parent labels resolve.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs text-neutral-600", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 shrink-0 text-neutral-400" aria-hidden="true" />
              )}
              <BreadcrumbItemContent item={item} isLast={isLast} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function BreadcrumbItemContent({ item, isLast }: { item: BreadcrumbItem; isLast: boolean }) {
  if (item.label === undefined) {
    // Skeleton width is approximate — enough to reserve space without
    // pretending to know how long the eventual label will be.
    return <Skeleton className="h-3 w-16" />;
  }
  if (isLast) {
    return (
      <span aria-current="page" className="font-medium text-neutral-900">
        {item.label}
      </span>
    );
  }
  if (item.to) {
    return (
      <Link
        to={item.to as never}
        params={item.params as never}
        className="text-neutral-600 transition-colors hover:text-neutral-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
      >
        {item.label}
      </Link>
    );
  }
  return <span>{item.label}</span>;
}
