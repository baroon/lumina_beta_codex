import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { DonutChartWrapper, type DonutChartDatum } from "@/components/charts/DonutChartWrapper";
import { CollapsibleCard } from "@/components/molecules/CollapsibleCard";
import { REPORTS_COPY } from "@/content/reports";
import type { EntityMentionDto } from "@/types/api";

// Per-entity palette shared across the workspace's competitive
// surfaces (mention donuts, trend lines, gap bars) so the same entity
// reads as the same color whether the user is on /overview or
// /competitors.
const ENTITY_PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#a855f7"];

function entityColor(isBrand: boolean, index: number): string {
  if (isBrand && index === 0) return ENTITY_PALETTE[0];
  return ENTITY_PALETTE[index % ENTITY_PALETTE.length];
}

interface ShareOfVoiceCardProps {
  mentions: readonly EntityMentionDto[];
  /**
   * Optional `entityType:entityId` allow-list. When omitted, every entity
   * in `mentions` participates in the donut — that's the /competitors
   * default. When provided (as on /overview's `EntityScopeToggle`-driven
   * flow), only entities whose key matches are surfaced.
   */
  selectedKeys?: readonly string[];
}

/**
 * Share-of-voice donut — slices entities by mention count, sized by share
 * of the total. Surfaces an empty-state card when no entity has any
 * mentions in window so the affordance still reads as "in scope, no data
 * yet" rather than collapsing into nothing.
 */
export function ShareOfVoiceCard({ mentions, selectedKeys }: ShareOfVoiceCardProps) {
  const copy = REPORTS_COPY.overview.sov;
  const selectedSet = useMemo(
    () => (selectedKeys == null ? null : new Set(selectedKeys)),
    [selectedKeys],
  );

  const filtered = mentions
    .filter((m) => selectedSet == null || selectedSet.has(`${m.entityType}:${m.entityId}`))
    .filter((m) => m.mentionCount > 0);
  const total = filtered.reduce((sum, m) => sum + m.mentionCount, 0);

  if (total === 0) {
    return (
      <CollapsibleCard icon={PieChart} title={copy.title} tooltip={copy.tooltip}>
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      </CollapsibleCard>
    );
  }

  const slices: DonutChartDatum[] = filtered.map((m, i) => ({
    id: `${m.entityType}:${m.entityId}`,
    label: m.name,
    value: m.mentionCount,
    color: entityColor(m.isTrackedBrand, i),
  }));

  return (
    <CollapsibleCard icon={PieChart} title={copy.title} tooltip={copy.tooltip}>
      <DonutChartWrapper
        data={slices}
        formatValue={(v) => `${v} (${Math.round((v / total) * 100)}%)`}
        height={200}
      />
    </CollapsibleCard>
  );
}
