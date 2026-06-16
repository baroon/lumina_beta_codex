import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { CollapsibleCard } from "@/components/molecules/CollapsibleCard";
import { REPORTS_COPY } from "@/content/reports";
import type { EntityMentionDto } from "@/types/api";

interface BrandVsCompetitorCardProps {
  mentions: readonly EntityMentionDto[];
  /**
   * Optional `entityType:entityId` allow-list. When omitted, every entity
   * with at least one mention is surfaced (the /competitors default).
   * When provided (as on /overview's entity-scope flow), only matching
   * entities pass.
   */
  selectedKeys?: readonly string[];
}

/**
 * Horizontal bar of raw mention counts per entity. Complements
 * `ShareOfVoiceCard`: the donut shows relative share, this bar shows
 * absolute volume — useful for spotting cases where a competitor has a
 * tiny SoV slice but still dominates by raw count, or vice versa.
 */
export function BrandVsCompetitorCard({ mentions, selectedKeys }: BrandVsCompetitorCardProps) {
  const copy = REPORTS_COPY.overview.mentions;
  const selectedSet = useMemo(
    () => (selectedKeys == null ? null : new Set(selectedKeys)),
    [selectedKeys],
  );

  const data: BarChartDatum[] = mentions
    .filter((m) => selectedSet == null || selectedSet.has(`${m.entityType}:${m.entityId}`))
    .filter((m) => m.mentionCount > 0)
    .map((m) => ({ label: m.name, value: m.mentionCount }));

  return (
    <CollapsibleCard icon={BarChart3} title={copy.brandVsCompetitor} tooltip={copy.tooltip}>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      ) : (
        <BarChartWrapper data={data} valueAxisLabel={copy.axisLabel} />
      )}
    </CollapsibleCard>
  );
}
