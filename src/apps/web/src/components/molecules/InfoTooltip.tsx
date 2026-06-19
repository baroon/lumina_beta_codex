import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /**
   * Plain-text name of what the tooltip is about — drives the aria-label
   * so screen readers announce e.g. "About Brand mention rate". Required.
   */
  label: string;
  /** Tooltip body explaining the metric, chart, or field in business terms. */
  body: string;
  /** Icon pixel size. Defaults to 12 — sized to sit beside small uppercase labels. */
  iconSize?: number;
  className?: string;
}

/**
 * Small ⓘ affordance + hover/focus tooltip. Used wherever a chart card
 * title or KPI tile label wants an inline explanatory hover. The trigger
 * is a focusable `<span role="button">` (not a real `<button>`) so it can
 * be safely nested inside a clickable parent — e.g. a HeroTile rendered
 * as a button — without producing invalid nested-button HTML. Click +
 * keyDown propagation is stopped so activating the icon doesn't also fire
 * the parent's onClick.
 */
export function InfoTooltip({ label, body, iconSize = 12, className }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            aria-label={`About ${label}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              // Block Enter/Space from bubbling to a parent button.
              if (e.key === "Enter" || e.key === " ") e.stopPropagation();
            }}
            className={cn(
              "inline-flex cursor-help items-center rounded-full text-neutral-400 transition hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
              className,
            )}
          >
            <Info size={iconSize} aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs text-neutral-700">
          {body}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
