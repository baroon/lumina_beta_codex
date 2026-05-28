import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import {
  LineChartWrapper,
  type LineChartPoint,
  type LineChartSeries,
} from "@/components/charts/LineChartWrapper";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { BrandSelector, type BrandSelectorEntity } from "@/components/molecules/BrandSelector";
import { REPORTS_COPY } from "@/content/reports";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import { cn } from "@/lib/utils";
import type {
  EntityTrendSeriesDto,
  WorkspaceHeroDto,
  WorkspaceOverviewDto,
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
        </>
      )}
    </div>
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
