import { useMemo } from "react";
import { ThumbsUp } from "lucide-react";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { CollapsibleCard } from "@/components/molecules/CollapsibleCard";
import { REPORTS_COPY } from "@/content/reports";
import type { EntityRateDto } from "@/types/api";

interface RecommendationRateCardProps {
  rates: readonly EntityRateDto[];
  /**
   * Optional `entityType:entityId` allow-list. When omitted, every entity
   * in `rates` participates in the bar — that's the /competitors
   * default. When provided (as on /overview via the entity scope toggle),
   * only matching entities are surfaced.
   */
  selectedKeys?: readonly string[];
}

/**
 * Horizontal bar chart of recommendation rate per entity. The
 * recommendation rate is "mentions tagged as recommendation /
 * mentions" — a different lens than raw mention count (an entity can
 * be loud but not endorsed). Entities with `recommendationRate == null`
 * (no mentions at all) are silently dropped from the chart so the y-axis
 * doesn't fill with em-dashes.
 */
export function RecommendationRateCard({ rates, selectedKeys }: RecommendationRateCardProps) {
  const copy = REPORTS_COPY.overview.recommendationRate;
  const selectedSet = useMemo(
    () => (selectedKeys == null ? null : new Set(selectedKeys)),
    [selectedKeys],
  );

  const data: BarChartDatum[] = rates
    .filter((r) => selectedSet == null || selectedSet.has(`${r.entityType}:${r.entityId}`))
    .filter((r) => r.recommendationRate != null)
    .map((r) => ({ label: r.name, value: r.recommendationRate ?? 0 }));

  return (
    <CollapsibleCard icon={ThumbsUp} title={copy.title} tooltip={copy.tooltip}>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      ) : (
        <BarChartWrapper
          data={data}
          valueAxisLabel={copy.axisLabel}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
      )}
    </CollapsibleCard>
  );
}
