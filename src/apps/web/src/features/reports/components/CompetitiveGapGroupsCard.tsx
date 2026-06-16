import { useMemo } from "react";
import { Target } from "lucide-react";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { CollapsibleCard } from "@/components/molecules/CollapsibleCard";
import { REPORTS_COPY } from "@/content/reports";
import type { BrandCompetitiveGapGroupDto, CompetitiveGapDto } from "@/types/api";

interface CompetitiveGapGroupsCardProps {
  groups: readonly BrandCompetitiveGapGroupDto[];
  /**
   * Optional `entityType:entityId` allow-list. When omitted, every
   * tracked brand group + every competitor inside each group is
   * surfaced — the /competitors default. When provided (as on
   * /overview's entity-scope flow), only matching entities pass the
   * filter; groups whose own tracked-brand key isn't selected drop
   * entirely.
   */
  selectedKeys?: readonly string[];
}

/**
 * Per-tracked-brand competitive gap card. Each group renders one
 * tracked brand with a bar chart of "mentions gap" against every
 * tracked competitor in scope (positive = brand is ahead, negative =
 * competitor is ahead). Useful for a glance read of where you're
 * winning vs trailing across the workspace's competitor set.
 */
export function CompetitiveGapGroupsCard({ groups, selectedKeys }: CompetitiveGapGroupsCardProps) {
  const copy = REPORTS_COPY.overview.competitiveGap;
  const selectedSet = useMemo(
    () => (selectedKeys == null ? null : new Set(selectedKeys)),
    [selectedKeys],
  );

  // Two-stage filter: drop groups whose tracked brand is deselected,
  // then narrow each group's competitor list to those still selected.
  // Final filter drops groups that ended up with zero visible bars.
  const visibleGroups = groups
    .filter((g) => selectedSet == null || selectedSet.has(`Brand:${g.trackedBrandId}`))
    .map((g) => ({
      ...g,
      gaps: g.gaps.filter(
        (gap) => selectedSet == null || selectedSet.has(`Competitor:${gap.competitorId}`),
      ),
    }))
    .filter((g) => g.gaps.length > 0);

  return (
    <CollapsibleCard icon={Target} title={copy.title} tooltip={copy.tooltip}>
      {visibleGroups.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.noGroups}</p>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map((g) => (
            <GapBlock key={g.trackedBrandId} group={g} />
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}

function GapBlock({ group }: { group: { trackedBrandName: string; gaps: CompetitiveGapDto[] } }) {
  const copy = REPORTS_COPY.overview.competitiveGap;
  const data: BarChartDatum[] = group.gaps.map((g) => ({
    label: g.competitorName,
    value: g.mentionsGap,
  }));
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-neutral-700">
        {copy.perBrandLabel.replace("{brandName}", group.trackedBrandName)}
      </h3>
      <BarChartWrapper data={data} valueAxisLabel="Mentions gap" />
    </div>
  );
}
