import { Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms/tooltip";
import { cn } from "@/lib/utils";

interface ChartCardHeaderProps {
  /**
   * Leading icon, rendered inside a soft primary-tinted badge to lift the
   * card visually and signal what the chart is about (e.g. `TrendingUp`
   * for trend, `PieChart` for share-of-voice, `Globe` for citation
   * domains).
   */
  icon: LucideIcon;
  title: string;
  /** Optional one-line caption under the title. */
  subtitle?: string;
  /**
   * Optional help-text body for the trailing info button. When empty or
   * omitted the button is hidden — keeps the header clean for charts
   * whose copy hasn't been authored yet.
   */
  tooltip?: string;
  /** Optional right-aligned slot (e.g. a "View all" link or metric toggle). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Chart-card header — leading badge icon, semantically compact title, and
 * an optional info tooltip. Lifts the visual weight of analytics cards so
 * they read as part of the same family as the discovery / brand-detail
 * cards (icon-led header, neutral-900 title, muted subtitle), rather than
 * the bare `<CardTitle>{string}</CardTitle>` pattern they replace.
 *
 * The tooltip body is plain text resolved by the caller — we leave the
 * locale resolution + key lookup to the content layer so this molecule
 * stays a pure UI primitive.
 */
export function ChartCardHeader({
  icon: Icon,
  title,
  subtitle,
  tooltip,
  actions,
  className,
}: ChartCardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 p-5 pb-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600"
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
            {tooltip ? (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`About ${title}`}
                      className="rounded-full text-neutral-400 transition hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    >
                      <Info size={13} aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs text-neutral-700">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          {subtitle ? <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
