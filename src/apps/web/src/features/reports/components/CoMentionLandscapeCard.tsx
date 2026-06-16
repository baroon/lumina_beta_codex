import { useMemo } from "react";
import { Users } from "lucide-react";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { CollapsibleCard } from "@/components/molecules/CollapsibleCard";
import { REPORTS_COPY } from "@/content/reports";
import type { WorkspaceCoMentionDto } from "@/types/api";

interface CoMentionLandscapeCardProps {
  rows: readonly WorkspaceCoMentionDto[];
  /**
   * Optional `entityType:entityId` allow-list. When omitted, every
   * competitor row is surfaced (the /competitors default). When
   * provided (as on /overview's entity-scope flow), only matching
   * competitors pass.
   */
  selectedKeys?: readonly string[];
}

/**
 * Co-mention landscape: for each competitor, the number of in-scope
 * answers where a tracked brand AND that competitor were both
 * mentioned, plus a per-row "share of competitor's mentions" caption.
 * Useful for spotting clusters / substitutes the buyer is comparing
 * you against.
 */
export function CoMentionLandscapeCard({ rows, selectedKeys }: CoMentionLandscapeCardProps) {
  const copy = REPORTS_COPY.overview.coMentionLandscape;
  const selectedSet = useMemo(
    () => (selectedKeys == null ? null : new Set(selectedKeys)),
    [selectedKeys],
  );
  const visibleRows = rows.filter(
    (r) => selectedSet == null || selectedSet.has(`Competitor:${r.competitorId}`),
  );

  if (visibleRows.length === 0) {
    return (
      <CollapsibleCard icon={Users} title={copy.title} tooltip={copy.tooltip}>
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      </CollapsibleCard>
    );
  }

  const data: BarChartDatum[] = visibleRows.map((r) => ({
    label: r.competitorName,
    value: r.coMentionCount,
  }));

  return (
    <CollapsibleCard icon={Users} title={copy.title} tooltip={copy.tooltip}>
      <p className="mb-3 text-xs text-neutral-500">{copy.subline}</p>
      <BarChartWrapper data={data} valueAxisLabel={copy.axisLabel} />
      <ul className="mt-3 space-y-1 text-xs text-neutral-600">
        {visibleRows.map((r) => {
          const share =
            r.competitorMentionCount === 0 ? null : r.coMentionCount / r.competitorMentionCount;
          return (
            <li
              key={r.competitorId}
              className="flex items-center justify-between border-b border-neutral-100 py-1 last:border-b-0"
            >
              <span className="font-medium text-neutral-700">{r.competitorName}</span>
              <span className="tabular-nums">
                {r.coMentionCount} / {r.competitorMentionCount}
                {share != null && (
                  <span className="ml-2 text-neutral-500">
                    ({Math.round(share * 100)}% {copy.shareSuffix})
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </CollapsibleCard>
  );
}
