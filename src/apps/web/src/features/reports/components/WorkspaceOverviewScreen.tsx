import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Globe, Minus, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { sentimentColors } from "@/components/charts/chartTheme";
import { DonutChartWrapper, type DonutChartDatum } from "@/components/charts/DonutChartWrapper";
import { HeatmapWrapper, type HeatmapData } from "@/components/charts/HeatmapWrapper";
import {
  LineChartWrapper,
  type LineChartPoint,
  type LineChartSeries,
} from "@/components/charts/LineChartWrapper";
import { RadarChartWrapper, type RadarChartDatum } from "@/components/charts/RadarChartWrapper";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { BrandSelector, type BrandSelectorEntity } from "@/components/molecules/BrandSelector";
import { REPORTS_COPY } from "@/content/reports";
import { useWorkspaceCompetitive } from "@/features/reports/hooks/useWorkspaceCompetitive";
import { useWorkspaceDepth } from "@/features/reports/hooks/useWorkspaceDepth";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import { cn } from "@/lib/utils";
import type {
  BrandCompetitiveGapGroupDto,
  CompetitiveGapDto,
  DomainRowDto,
  DomainTypeShareDto,
  EntityMentionDto,
  EntityRateDto,
  EntityTrendSeriesDto,
  HeatmapDto,
  PlatformMentionDto,
  SentimentSliceDto,
  WorkspaceHeroDto,
  WorkspaceOverviewDto,
  WorkspaceRecentChatDto,
  WorkspaceTopEntityRowDto,
} from "@/types/api";

// Stable per-entity palette. First tracked brand picks index 0 (primary
// brand color); each subsequent entity rotates through.
const ENTITY_PALETTE = [
  "#6366f1", // primary-500 — tracked brand
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
];

// Metric switcher options — same shape as the v2 dashboard.
const METRIC_OPTIONS: Array<{
  value: string;
  label: string;
  brandMetric: string;
  competitorMetric: string;
}> = [
  {
    value: "mention",
    label: "Mention rate",
    brandMetric: "BrandMentionRate",
    competitorMetric: "MentionRate",
  },
  {
    value: "rec",
    label: "Recommendation rate",
    brandMetric: "BrandRecommendationRate",
    competitorMetric: "RecommendationRate",
  },
];

/**
 * Phase 4 v3 Slice A — Workspace Overview screen at `/overview`. Aggregates
 * the last N days of scans across every tracked brand + every tracker in
 * the workspace. Brand selector filters which entities flow through the
 * trend chart + Top Entities table.
 */
export function WorkspaceOverviewScreen() {
  const [days, setDays] = useState(30);
  const [metricKey, setMetricKey] = useState(METRIC_OPTIONS[0].value);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [allSelectedInit, setAllSelectedInit] = useState(false);
  const { data, isLoading, isError, error, refetch } = useWorkspaceOverview(days);
  const copy = REPORTS_COPY.overview;

  // Default selection — all entities when data first lands.
  useEffect(() => {
    if (!data || allSelectedInit) return;
    const keys = [
      ...data.trackedBrands.map((b) => `Brand:${b.brandId}`),
      ...data.competitors.map((c) => `Competitor:${c.competitorId}`),
    ];
    setSelectedKeys(keys);
    setAllSelectedInit(true);
  }, [data, allSelectedInit]);

  if (isLoading) return <LoadingPage />;
  if (isError) {
    return (
      <ErrorPage
        error={error instanceof Error ? error : undefined}
        onReset={() => void refetch()}
      />
    );
  }
  if (!data) return null;

  const trackedBrandsEntities: BrandSelectorEntity[] = data.trackedBrands.map((b) => ({
    id: b.brandId,
    entityType: "Brand",
    name: b.name,
  }));
  const competitorEntities: BrandSelectorEntity[] = data.competitors.map((c) => ({
    id: c.competitorId,
    entityType: "Competitor",
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle.replace("{days}", String(data.days))}
      />

      <ComparisonControlsRow
        days={days}
        onDaysChange={setDays}
        metricKey={metricKey}
        onMetricKeyChange={setMetricKey}
        trackedBrands={trackedBrandsEntities}
        competitors={competitorEntities}
        selectedKeys={selectedKeys}
        onSelectedKeysChange={setSelectedKeys}
      />

      {data.trackedBrands.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            {copy.empty.noBrands}
          </CardContent>
        </Card>
      ) : (
        <>
          <HeroRow hero={data.hero} />
          <TrendChartCard data={data} metricKey={metricKey} selectedKeys={selectedKeys} />
          <TopEntitiesCard rows={data.topEntities} selectedKeys={selectedKeys} />

          {/* Slice B competitive sections — fetched separately so an
              aggregation failure in one doesn't blank the whole page. */}
          <CompetitiveSections days={days} selectedKeys={selectedKeys} />

          {/* Slice C depth sections + recent chats. Same pattern. */}
          <DepthSections days={days} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slice B sections — fetched from /api/overview/competitive
// ---------------------------------------------------------------------------

function CompetitiveSections({
  days,
  selectedKeys,
}: {
  days: number;
  selectedKeys: readonly string[];
}) {
  const { data, isLoading, isError } = useWorkspaceCompetitive(days);
  if (isLoading || isError || !data) return null;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <ShareOfVoiceCard mentions={data.mentionDistribution} selectedKeys={selectedKeys} />
        <RecommendationRateCard rates={data.recommendationRates} selectedKeys={selectedKeys} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BrandVsCompetitorCard mentions={data.mentionDistribution} selectedKeys={selectedKeys} />
        <MentionDistributionCard mentions={data.mentionDistribution} selectedKeys={selectedKeys} />
      </div>
      <CompetitiveGapGroupsCard groups={data.competitiveGaps} selectedKeys={selectedKeys} />
      <div className="grid gap-4 lg:grid-cols-2">
        <TopCitationDomainsCard rows={data.topDomains} />
        <DomainTypesCard rows={data.domainTypes} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Share of Voice donut — recomputes denominator from selected entities
// ---------------------------------------------------------------------------

function ShareOfVoiceCard({
  mentions,
  selectedKeys,
}: {
  mentions: readonly EntityMentionDto[];
  selectedKeys: readonly string[];
}) {
  const copy = REPORTS_COPY.overview.sov;
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const filtered = mentions
    .filter((m) => selectedSet.has(`${m.entityType}:${m.entityId}`))
    .filter((m) => m.mentionCount > 0);
  const total = filtered.reduce((sum, m) => sum + m.mentionCount, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        </CardContent>
      </Card>
    );
  }

  const slices: DonutChartDatum[] = filtered.map((m, i) => ({
    id: `${m.entityType}:${m.entityId}`,
    label: m.name,
    value: m.mentionCount,
    color: entityColor(m.isTrackedBrand, i),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DonutChartWrapper
          data={slices}
          formatValue={(v) => `${v} (${Math.round((v / total) * 100)}%)`}
          height={260}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recommendation rate by entity bar — filtered, counts not shares
// ---------------------------------------------------------------------------

function RecommendationRateCard({
  rates,
  selectedKeys,
}: {
  rates: readonly EntityRateDto[];
  selectedKeys: readonly string[];
}) {
  const copy = REPORTS_COPY.overview.recommendationRate;
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const data: BarChartDatum[] = rates
    .filter((r) => selectedSet.has(`${r.entityType}:${r.entityId}`))
    .filter((r) => r.recommendationRate != null)
    .map((r) => ({ label: r.name, value: r.recommendationRate ?? 0 }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <BarChartWrapper
            data={data}
            maxValue={1}
            valueAxisLabel={copy.axisLabel}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Brand vs Competitor mentions bar — filtered, raw counts
// ---------------------------------------------------------------------------

function BrandVsCompetitorCard({
  mentions,
  selectedKeys,
}: {
  mentions: readonly EntityMentionDto[];
  selectedKeys: readonly string[];
}) {
  const copy = REPORTS_COPY.overview.mentions;
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const data: BarChartDatum[] = mentions
    .filter((m) => selectedSet.has(`${m.entityType}:${m.entityId}`))
    .filter((m) => m.mentionCount > 0)
    .map((m) => ({ label: m.name, value: m.mentionCount }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.brandVsCompetitor}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <BarChartWrapper data={data} valueAxisLabel={copy.axisLabel} />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mention distribution radar — filtered
// ---------------------------------------------------------------------------

function MentionDistributionCard({
  mentions,
  selectedKeys,
}: {
  mentions: readonly EntityMentionDto[];
  selectedKeys: readonly string[];
}) {
  const copy = REPORTS_COPY.overview.mentions;
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const data: RadarChartDatum[] = mentions
    .filter((m) => selectedSet.has(`${m.entityType}:${m.entityId}`))
    .filter((m) => m.mentionCount > 0)
    .map((m) => ({ axis: m.name, value: m.mentionCount }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.distribution}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <RadarChartWrapper data={data} />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Competitive gap groups (one section per tracked brand)
// ---------------------------------------------------------------------------

function CompetitiveGapGroupsCard({
  groups,
  selectedKeys,
}: {
  groups: readonly BrandCompetitiveGapGroupDto[];
  selectedKeys: readonly string[];
}) {
  const copy = REPORTS_COPY.overview.competitiveGap;
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  // Filter each group's competitor list to those selected; drop groups
  // whose tracked brand is itself deselected.
  const visibleGroups = groups
    .filter((g) => selectedSet.has(`Brand:${g.trackedBrandId}`))
    .map((g) => ({
      ...g,
      gaps: g.gaps.filter((gap) => selectedSet.has(`Competitor:${gap.competitorId}`)),
    }))
    .filter((g) => g.gaps.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {visibleGroups.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noGroups}</p>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((g) => (
              <GapBlock key={g.trackedBrandId} group={g} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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

// ---------------------------------------------------------------------------
// Top citation domains table — workspace-wide; not filtered by selector
// ---------------------------------------------------------------------------

function TopCitationDomainsCard({ rows }: { rows: readonly DomainRowDto[] }) {
  const copy = REPORTS_COPY.overview.topDomains;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {copy.columns.source}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {copy.columns.domain}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {copy.columns.type}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {copy.columns.citations}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.sourceId} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 font-medium text-neutral-900">{r.sourceName}</td>
                    <td className="px-3 py-2 text-neutral-600">
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3 w-3 text-neutral-400" aria-hidden="true" />
                        {r.normalizedDomain ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-xs">
                        {r.sourceType}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.citationCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Domain types donut — workspace-wide; not filtered by selector
// ---------------------------------------------------------------------------

function DomainTypesCard({ rows }: { rows: readonly DomainTypeShareDto[] }) {
  const copy = REPORTS_COPY.overview.domainTypes;
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        </CardContent>
      </Card>
    );
  }

  const slices: DonutChartDatum[] = rows.map((r, i) => ({
    id: r.sourceType,
    label: r.sourceType,
    value: r.citationCount,
    color: ENTITY_PALETTE[i % ENTITY_PALETTE.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DonutChartWrapper
          data={slices}
          formatValue={(v) =>
            `${v} (${Math.round((v / rows.reduce((s, r) => s + r.citationCount, 0)) * 100)}%)`
          }
          height={260}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Comparison controls row — days + brand selector + metric switcher
// ---------------------------------------------------------------------------

interface ComparisonControlsRowProps {
  days: number;
  onDaysChange: (days: number) => void;
  metricKey: string;
  onMetricKeyChange: (key: string) => void;
  trackedBrands: readonly BrandSelectorEntity[];
  competitors: readonly BrandSelectorEntity[];
  selectedKeys: readonly string[];
  onSelectedKeysChange: (next: string[]) => void;
}

function ComparisonControlsRow({
  days,
  onDaysChange,
  metricKey,
  onMetricKeyChange,
  trackedBrands,
  competitors,
  selectedKeys,
  onSelectedKeysChange,
}: ComparisonControlsRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <DaysButtonGroup days={days} onChange={onDaysChange} />
      <BrandSelector
        trackedBrands={trackedBrands}
        competitors={competitors}
        selectedKeys={selectedKeys}
        onChange={onSelectedKeysChange}
      />
      <div className="ml-auto flex items-center gap-2 text-xs text-neutral-500">
        <label htmlFor="metric-switcher">Metric:</label>
        <select
          id="metric-switcher"
          value={metricKey}
          onChange={(e) => onMetricKeyChange(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700 shadow-sm"
        >
          {METRIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DaysButtonGroup({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  const options = [7, 30, 90];
  return (
    <div
      className="inline-flex rounded-md border border-neutral-300 bg-white p-0.5"
      role="group"
      aria-label="Window"
    >
      {options.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          aria-pressed={days === d}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition",
            days === d
              ? "bg-primary-100 text-primary-700"
              : "text-neutral-600 hover:bg-neutral-100",
          )}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero tiles
// ---------------------------------------------------------------------------

function HeroRow({ hero }: { hero: WorkspaceHeroDto }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <HeroTile label="Queries" value={hero.queries.toLocaleString()} />
      <HeroTile label="Mentions" value={hero.mentions.toLocaleString()} />
      <HeroTile label="Citations" value={hero.citations.toLocaleString()} />
      <HeroTile
        label="Brand mention rate"
        value={hero.brandMentionRate == null ? "—" : `${Math.round(hero.brandMentionRate * 100)}%`}
      />
    </div>
  );
}

function HeroTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trend chart card
// ---------------------------------------------------------------------------

interface TrendChartCardProps {
  data: WorkspaceOverviewDto;
  metricKey: string;
  selectedKeys: readonly string[];
}

function TrendChartCard({ data, metricKey, selectedKeys }: TrendChartCardProps) {
  const metric = METRIC_OPTIONS.find((m) => m.value === metricKey) ?? METRIC_OPTIONS[0];
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const series: LineChartSeries[] = useMemo(() => {
    const filtered = data.series.filter((s) => {
      const k = `${s.entityType}:${s.entityId}`;
      if (!selectedSet.has(k)) return false;
      if (s.entityType === "Brand") return s.metricName === metric.brandMetric;
      return s.metricName === metric.competitorMetric;
    });
    return filtered.map((s, i) => ({
      id: s.entityId,
      name: s.entityName,
      color: entityColor(s.entityType === "Brand", i),
      data: seriesToPoints(s),
    }));
  }, [data.series, metric, selectedSet]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visibility over time</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-sm text-neutral-500">No trend data in the selected window yet.</p>
        ) : (
          <LineChartWrapper
            series={series}
            formatValue={(v: number) => `${Math.round(v * 100)}%`}
            maxValue={1}
          />
        )}
      </CardContent>
    </Card>
  );
}

function seriesToPoints(s: EntityTrendSeriesDto): LineChartPoint[] {
  return s.points.map((p) => ({ x: p.capturedAt, y: p.value ?? null }));
}

// ---------------------------------------------------------------------------
// Top Entities table
// ---------------------------------------------------------------------------

function TopEntitiesCard({
  rows,
  selectedKeys,
}: {
  rows: readonly WorkspaceTopEntityRowDto[];
  selectedKeys: readonly string[];
}) {
  const copy = REPORTS_COPY.overview.topEntities;
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const visibleRows = rows.filter((r) => selectedSet.has(`${r.entityType}:${r.entityId}`));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {visibleRows.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    {copy.columns.entity}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.columns.visibility}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.columns.shareOfVoice}
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    {copy.columns.sentiment}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visibleRows.map((row) => (
                  <tr key={`${row.entityType}:${row.entityId}`} className="hover:bg-neutral-50">
                    <td className="px-4 py-2">
                      <span className="font-medium text-neutral-900">{row.name}</span>
                      {row.isTrackedBrand && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {copy.youChip}
                        </Badge>
                      )}
                    </td>
                    <MetricCell value={row.visibility} delta={row.visibilityDelta} />
                    <MetricCell value={row.shareOfVoice} delta={row.shareOfVoiceDelta} />
                    <td className="px-4 py-2 text-left">
                      {row.sentiment ? (
                        <Badge variant={sentimentVariant(row.sentiment)} className="text-xs">
                          {row.sentiment}
                        </Badge>
                      ) : (
                        <span className="text-xs text-neutral-400">{copy.noData}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCell({ value, delta }: { value: number | null; delta: number | null }) {
  const copy = REPORTS_COPY.overview.topEntities;
  if (value == null) {
    return <td className="px-4 py-2 text-right tabular-nums text-neutral-400">{copy.noData}</td>;
  }
  return (
    <td className="px-4 py-2 text-right">
      <div className="flex items-center justify-end gap-2 tabular-nums">
        <span className="text-neutral-900">{Math.round(value * 100)}%</span>
        {delta != null && <DeltaChip delta={delta} />}
      </div>
    </td>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const pctPoints = Math.round(delta * 100);
  const sign = delta > 0 ? "+" : "";
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const color =
    delta > 0
      ? "text-semantic-success-700"
      : delta < 0
        ? "text-semantic-error-700"
        : "text-neutral-500";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs", color)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {sign}
      {pctPoints}pp
    </span>
  );
}

function sentimentVariant(
  value: string,
): "default" | "secondary" | "outline" | "success" | "warning" {
  switch (value) {
    case "Positive":
      return "success";
    case "Negative":
    case "Mixed":
      return "warning";
    case "Neutral":
    case "Unknown":
    default:
      return "secondary";
  }
}

function entityColor(isBrand: boolean, index: number): string {
  if (isBrand && index === 0) return ENTITY_PALETTE[0];
  return ENTITY_PALETTE[index % ENTITY_PALETTE.length];
}

// ---------------------------------------------------------------------------
// Slice C depth sections — fetched from /api/overview/depth
// ---------------------------------------------------------------------------

function DepthSections({ days }: { days: number }) {
  const { data, isLoading, isError } = useWorkspaceDepth(days);
  const [selectedChat, setSelectedChat] = useState<WorkspaceRecentChatDto | null>(null);

  if (isLoading || isError || !data) return null;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <MentionsByPlatformCard rows={data.mentionsByPlatform} />
        <SentimentDistributionCard slices={data.sentimentDistribution} />
      </div>
      <ActivityHeatmapCard heatmap={data.activityHeatmap} />
      <TopicHeatmapCard heatmap={data.topicHeatmap} />
      <RecentChatsCard chats={data.recentChats} onSelect={setSelectedChat} />
      <RecentChatDrawer chat={selectedChat} onClose={() => setSelectedChat(null)} />
    </>
  );
}

function MentionsByPlatformCard({ rows }: { rows: readonly PlatformMentionDto[] }) {
  const copy = REPORTS_COPY.overview.platforms;
  const data: BarChartDatum[] = rows
    .filter((r) => r.brandMentionRate != null)
    .map((r) => ({ label: r.platformName, value: r.brandMentionRate ?? 0 }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <BarChartWrapper
            data={data}
            maxValue={1}
            valueAxisLabel={copy.axisLabel}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
        )}
      </CardContent>
    </Card>
  );
}

function SentimentDistributionCard({ slices }: { slices: readonly SentimentSliceDto[] }) {
  const copy = REPORTS_COPY.overview.sentiment;
  const data: DonutChartDatum[] = slices.map((s) => ({
    id: s.sentiment,
    label: s.sentiment,
    value: s.count,
    color: sentimentColors[s.sentiment] ?? sentimentColors.Unknown,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <DonutChartWrapper data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function ActivityHeatmapCard({ heatmap }: { heatmap: HeatmapDto }) {
  const copy = REPORTS_COPY.overview.activity;
  const data: HeatmapData = useMemo(
    () => ({
      rows: [...heatmap.rows],
      cols: [...heatmap.columns],
      cells: heatmap.cells.map((c) => ({ row: c.row, col: c.column, value: c.value })),
    }),
    [heatmap],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <p className="text-sm text-neutral-500">{copy.subtitle}</p>
      </CardHeader>
      <CardContent>
        {data.rows.length === 0 || data.cols.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <HeatmapWrapper data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function TopicHeatmapCard({ heatmap }: { heatmap: HeatmapDto }) {
  const copy = REPORTS_COPY.overview.topicCoverage;
  const data: HeatmapData = useMemo(
    () => ({
      rows: [...heatmap.rows],
      cols: [...heatmap.columns],
      cells: heatmap.cells.map((c) => ({ row: c.row, col: c.column, value: c.value })),
    }),
    [heatmap],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <p className="text-sm text-neutral-500">{copy.subtitle}</p>
      </CardHeader>
      <CardContent>
        {data.rows.length === 0 || data.cols.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <HeatmapWrapper data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function RecentChatsCard({
  chats,
  onSelect,
}: {
  chats: readonly WorkspaceRecentChatDto[];
  onSelect: (chat: WorkspaceRecentChatDto) => void;
}) {
  const copy = REPORTS_COPY.overview.recentChats;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chats.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.empty}</p>
        ) : (
          <ul className="space-y-3">
            {chats.map((chat) => (
              <li key={chat.answerId}>
                <button
                  type="button"
                  onClick={() => onSelect(chat)}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-left transition hover:border-primary-300 hover:bg-primary-50/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium text-neutral-900">
                      {chat.promptText}
                    </p>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {formatRelativeTime(chat.capturedAt)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-neutral-600">{chat.answerSnippet}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <Badge variant="secondary">{chat.brandName}</Badge>
                    <Badge variant="outline">{chat.platformName}</Badge>
                    <Badge variant="outline">{chat.lensName}</Badge>
                    {chat.brandSentiment && (
                      <Badge variant={sentimentVariant(chat.brandSentiment)}>
                        {chat.brandSentiment}
                      </Badge>
                    )}
                    <span>
                      {chat.mentionCount} {copy.mentionsLabel}
                    </span>
                    <span>
                      {chat.citationCount} {copy.citationsLabel}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentChatDrawer({
  chat,
  onClose,
}: {
  chat: WorkspaceRecentChatDto | null;
  onClose: () => void;
}) {
  const copy = REPORTS_COPY.overview.recentChats.drawer;
  if (!chat) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      className="fixed inset-0 z-50 flex justify-end bg-neutral-900/40"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">{copy.title}</h2>
          <Button variant="ghost" size="icon" aria-label={copy.close} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="space-y-4 px-6 py-4 text-sm text-neutral-700">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">{copy.prompt}</p>
            <p className="mt-1 font-medium text-neutral-900">{chat.promptText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <DetailField label={copy.brand} value={chat.brandName} />
            <DetailField label={copy.tracker} value={chat.trackerName} />
            <DetailField label={copy.platform} value={chat.platformName} />
            <DetailField label={copy.lens} value={chat.lensName} />
            <DetailField label={copy.captured} value={formatAbsoluteTime(chat.capturedAt)} />
            {chat.brandSentiment && <DetailField label="Sentiment" value={chat.brandSentiment} />}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">{copy.answer}</p>
            <p className="mt-1 whitespace-pre-line leading-relaxed">{chat.answerSnippet}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm text-neutral-900">{value}</p>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  } catch {
    return iso;
  }
}

function formatAbsoluteTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
