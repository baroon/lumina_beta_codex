import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/atoms/card";
import { ChartCardHeader } from "@/components/molecules/ChartCardHeader";

interface CollapsibleCardProps {
  /** Leading badge icon shown in the header. */
  icon: LucideIcon;
  /** Card title. */
  title: string;
  /** Optional one-line subtitle under the title. */
  subtitle?: string;
  /** Optional info-tooltip body for the ⓘ button. */
  tooltip?: string;
  /** Optional right-side actions slot (rendered left of the collapse chevron). */
  actions?: ReactNode;
  /** Whether the card starts expanded. Defaults to expanded. */
  defaultOpen?: boolean;
  /** Card body — chart, table, etc. Hidden when collapsed. */
  children: ReactNode;
}

/**
 * Card + ChartCardHeader + collapse toggle in one drop-in wrapper.
 * Used wherever an analytics card on /overview wants a "click the
 * chevron to hide the chart" affordance. State is per-card local —
 * collapses don't persist across reloads (yet); add a key + localStorage
 * here once we know we want that.
 */
export function CollapsibleCard({
  icon,
  title,
  subtitle,
  tooltip,
  actions,
  defaultOpen = true,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <ChartCardHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        tooltip={tooltip}
        actions={actions}
        collapsed={!open}
        onToggleCollapsed={() => setOpen((o) => !o)}
      />
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
