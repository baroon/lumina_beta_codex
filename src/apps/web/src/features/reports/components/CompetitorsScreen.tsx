import { useMemo } from "react";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { defaultDateRangeSelection } from "@/components/molecules/DateRangePicker";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { useWorkspaceCompetitive } from "@/features/reports/hooks/useWorkspaceCompetitive";
import { cn } from "@/lib/utils";
import type { EntityMentionDto, EntityRateDto } from "@/types/api";

/**
 * Workspace-wide competitor ranks at /competitors. Joins
 * `mentionDistribution` (mention counts + share of voice) with
 * `recommendationRates` (recommendation rate per entity) from
 * `useWorkspaceCompetitive` into a single sortable row per entity.
 * Tracked brands are highlighted with a 'You' badge.
 *
 * Scope follows the sidebar's TrackerSelector via `useTrackerScope`.
 */
export function CompetitorsScreen() {
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const competitive = useWorkspaceCompetitive(
    defaultDateRangeSelection(),
    [],
    [],
    [],
    [],
    [],
    trackerIds,
  );

  if (competitive.isLoading) return <LoadingPage />;
  if (competitive.isError) {
    return (
      <ErrorPage
        error={competitive.error instanceof Error ? competitive.error : undefined}
        onReset={() => void competitive.refetch()}
      />
    );
  }
  if (!competitive.data) return null;

  const rows = mergeEntityRows(
    competitive.data.mentionDistribution,
    competitive.data.recommendationRates,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Competitors"
        description="Competitor ranks aggregated across the selected trackers — mentions, share of voice, and recommendation rates."
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <SectionHeader
            title="Competitive ranking"
            meta={
              <span className="text-xs text-neutral-500">
                {rows.length} {rows.length === 1 ? "entity" : "entities"}
              </span>
            }
          />
          {rows.length === 0 ? (
            <p className="text-xs text-neutral-500">
              No competitor data in scope yet. Run a scan that includes competitor mentions to
              populate this page.
            </p>
          ) : (
            <CompetitorsTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row composition
// ---------------------------------------------------------------------------

export interface CompetitorRow {
  entityType: string;
  entityId: string;
  name: string;
  isTrackedBrand: boolean;
  mentionCount: number;
  shareOfVoice: number;
  recommendationRate: number | null;
}

/**
 * Joins the workspace-competitive mention + recommendation lists into a
 * single row per entity. Falls back to nulls when the entity is missing
 * from one of the source lists. Sorted by mention count desc — the
 * natural "rank" ordering for the page.
 *
 * Exported so the merge logic can be unit-tested without spinning up
 * React Query.
 */
export function mergeEntityRows(
  mentions: readonly EntityMentionDto[],
  rates: readonly EntityRateDto[],
): CompetitorRow[] {
  const byKey = new Map<string, CompetitorRow>();
  for (const m of mentions) {
    const key = `${m.entityType}:${m.entityId}`;
    byKey.set(key, {
      entityType: m.entityType,
      entityId: m.entityId,
      name: m.name,
      isTrackedBrand: m.isTrackedBrand,
      mentionCount: m.mentionCount,
      shareOfVoice: m.share,
      recommendationRate: null,
    });
  }
  for (const r of rates) {
    const key = `${r.entityType}:${r.entityId}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.recommendationRate = r.recommendationRate;
    } else {
      byKey.set(key, {
        entityType: r.entityType,
        entityId: r.entityId,
        name: r.name,
        isTrackedBrand: r.isTrackedBrand,
        mentionCount: r.mentionCount,
        shareOfVoice: 0,
        recommendationRate: r.recommendationRate,
      });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.mentionCount - a.mentionCount);
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function CompetitorsTable({ rows }: { rows: readonly CompetitorRow[] }) {
  const maxMentions = useMemo(
    () => rows.reduce((max, r) => Math.max(max, r.mentionCount), 0),
    [rows],
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          <tr>
            <Th className="w-10 text-right">#</Th>
            <Th>Entity</Th>
            <Th className="text-right">Mentions</Th>
            <Th className="text-right">Share of voice</Th>
            <Th className="text-right">Recommendation rate</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row, index) => {
            const isTopMover = index === 0 && row.mentionCount > 0;
            return (
              <tr
                key={`${row.entityType}:${row.entityId}`}
                className={cn(row.isTrackedBrand && "bg-primary-50/40")}
              >
                <Td className="w-10 text-right text-neutral-500 tabular-nums">{index + 1}</Td>
                <Td>
                  <span className="font-medium text-neutral-900">{row.name}</span>
                  {row.isTrackedBrand && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      You
                    </Badge>
                  )}
                  {isTopMover && !row.isTrackedBrand && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      Leader
                    </Badge>
                  )}
                </Td>
                <Td className="text-right tabular-nums">
                  <MentionBar count={row.mentionCount} max={maxMentions} />
                </Td>
                <Td className="text-right tabular-nums text-neutral-900">
                  {formatPct(row.shareOfVoice)}
                </Td>
                <Td className="text-right tabular-nums">
                  {row.recommendationRate == null ? (
                    <span className="text-neutral-400">—</span>
                  ) : (
                    <span className="text-neutral-900">{formatPct(row.recommendationRate)}</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MentionBar({ count, max }: { count: number; max: number }) {
  const widthPct = max === 0 ? 0 : (count / max) * 100;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden sm:block h-1.5 w-16 overflow-hidden rounded bg-neutral-100">
        <span
          className="block h-full rounded bg-primary-400"
          style={{ width: `${widthPct}%` }}
          aria-hidden
        />
      </span>
      <span className="text-neutral-900">{count}</span>
    </span>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("px-3 py-2 text-left text-[10px] font-medium", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-middle text-neutral-700", className)}>{children}</td>;
}

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
