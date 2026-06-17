import { Layers } from "lucide-react";
import { DonutChartWrapper, type DonutChartDatum } from "@/components/charts/DonutChartWrapper";
import { CollapsibleCard } from "@/components/molecules/CollapsibleCard";
import { REPORTS_COPY } from "@/content/reports";
import type { DomainTypeShareDto } from "@/types/api";

// Per-slice palette shared with /overview's other entity surfaces so
// the same source-type reads as the same colour wherever it appears.
const ENTITY_PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#a855f7"];

interface DomainTypesCardProps {
  rows: readonly DomainTypeShareDto[];
}

/**
 * Source-type donut: citations broken out by the dominant SourceType
 * per Source. Workspace-aggregate input on /overview (pre-aggregated by
 * the BE on the competitive endpoint); on /sources the same shape is
 * computed locally from the filtered domain rows so the donut respects
 * the page's filter bar.
 */
export function DomainTypesCard({ rows }: DomainTypesCardProps) {
  const copy = REPORTS_COPY.overview.domainTypes;
  if (rows.length === 0) {
    return (
      <CollapsibleCard icon={Layers} title={copy.title} tooltip={copy.tooltip}>
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      </CollapsibleCard>
    );
  }

  const total = rows.reduce((sum, r) => sum + r.citationCount, 0);
  const slices: DonutChartDatum[] = rows.map((r, i) => ({
    id: r.sourceType,
    label: r.sourceType,
    value: r.citationCount,
    color: ENTITY_PALETTE[i % ENTITY_PALETTE.length],
  }));

  return (
    <CollapsibleCard icon={Layers} title={copy.title} tooltip={copy.tooltip}>
      <DonutChartWrapper
        data={slices}
        formatValue={(v) => `${v} (${total === 0 ? 0 : Math.round((v / total) * 100)}%)`}
        height={200}
      />
    </CollapsibleCard>
  );
}
