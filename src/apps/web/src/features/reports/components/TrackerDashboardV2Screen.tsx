import { useMemo, useState } from "react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { DonutChartWrapper, type DonutChartDatum } from "@/components/charts/DonutChartWrapper";
import {
  LineChartWrapper,
  type LineChartPoint,
  type LineChartSeries,
} from "@/components/charts/LineChartWrapper";
import { RadarChartWrapper, type RadarChartDatum } from "@/components/charts/RadarChartWrapper";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useTrackerCompetitive } from "@/features/reports/hooks/useTrackerCompetitive";
import { useTrackerDashboard } from "@/features/reports/hooks/useTrackerDashboard";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Globe, Minus } from "lucide-react";
import type {
  CompetitiveGapDto,
  DomainRowDto,
  DomainTypeShareDto,
  EntityMentionDto,
  EntityRateDto,
  TopBrandRowDto,
  TrackerDashboardDto,
} from "@/types/api";

interface TrackerDashboardV2ScreenProps {
  trackerId: string;
}

// Stable per-entity palette — first tracked-brand always picks index 0
// (primary brand color), each subsequent entity rotates through.
const ENTITY_PALETTE = [
  "#6366f1", // primary-500 — tracked brand
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#a855f7", // purple
];

// Numeric metrics the user can switch the multi-brand chart to. Brand-side
// metrics work for the brand entity; competitor entities only have one
// rate-equivalent series so the switcher maps to the matching pair.
const METRIC_OPTIONS: Array<{
  value: string;
  label: string;
  brandMetric: string;
  /** For competitors — which trend metric equates to this brand metric? */
  competitorMetric: string;
  format: "pct";
}> = [
  {
    value: "mention",
    label: "Mention rate",
    brandMetric: "BrandMentionRate",
    competitorMetric: "MentionRate",
    format: "pct",
  },
  {
    value: "rec",
    label: "Recommendation rate",
    brandMetric: "BrandRecommendationRate",
    competitorMetric: "RecommendationRate",
    format: "pct",
  },
];

/**
 * Visibility Tracker Dashboard v2 (Phase 4 v2 Slice A). Replaces the v1
 * 6-card trend grid with a competitive-analytics surface: filter row + 4
 * hero tiles + multi-brand trend chart + top brands table. Slices B + C
 * add sources/domains/SoV/radar and platform/topic depth in follow-up
 * commits.
 */
export function TrackerDashboardV2Screen({ trackerId }: TrackerDashboardV2ScreenProps) {
  const [days, setDays] = useState(30);
  const [metricKey, setMetricKey] = useState(METRIC_OPTIONS[0].value);
  const { data, isLoading, isError, error, refetch } = useTrackerDashboard(trackerId, days);
  const copy = REPORTS_COPY.dashboard;

  if (isLoading) return <LoadingPage />;

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            {copy.empty.notFound}
          </CardContent>
        </Card>
      );
    }
    return (
      <ErrorPage
        error={error instanceof Error ? error : undefined}
        onReset={() => void refetch()}
      />
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.trackerName}
        description={`${data.brandName} — ${copy.subtitle.replace("{days}", String(data.days))}`}
      />

      <FilterBar days={days} onDaysChange={setDays} />
      <HeroRow hero={data.hero} />
      <TrendChartCard data={data} metricKey={metricKey} onMetricKeyChange={setMetricKey} />
      <TopBrandsCard rows={data.topBrands} />

      {/* Phase 4 v2 Slice B: competitive intelligence sections fetched
          separately so an aggregation failure in one doesn't blank the
          whole dashboard. */}
      <CompetitiveSections trackerId={trackerId} days={days} brandId={data.brandId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slice B sections — fetched from /dashboard/competitive
// ---------------------------------------------------------------------------

interface CompetitiveSectionsProps {
  trackerId: string;
  days: number;
  brandId: string;
}

function CompetitiveSections({ trackerId, days, brandId }: CompetitiveSectionsProps) {
  const { data, isLoading, isError } = useTrackerCompetitive(trackerId, days);

  if (isLoading || isError || !data) return null;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <ShareOfVoiceCard mentions={data.mentionDistribution} brandId={brandId} />
        <CompetitiveGapCard gaps={data.competitiveGaps} />
      </div>
      <RecommendationRateCard rates={data.recommendationRates} brandId={brandId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <BrandVsCompetitorCard mentions={data.mentionDistribution} brandId={brandId} />
        <MentionDistributionCard mentions={data.mentionDistribution} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TopCitationDomainsCard rows={data.topDomains} />
        <DomainTypesCard rows={data.domainTypes} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Share of Voice donut
// ---------------------------------------------------------------------------

function ShareOfVoiceCard({
  mentions,
  brandId,
}: {
  mentions: readonly EntityMentionDto[];
  brandId: string;
}) {
  const copy = REPORTS_COPY.dashboard.sov;
  const total = mentions.reduce((sum, m) => sum + m.mentionCount, 0);

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

  const slices: DonutChartDatum[] = mentions
    .filter((m) => m.mentionCount > 0)
    .map((m, i) => ({
      id: `${m.entityType}:${m.entityId}`,
      label: m.name,
      value: m.mentionCount,
      color: entityColor(m.entityId === brandId, i),
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
// Brand vs Competitor mentions bar
// ---------------------------------------------------------------------------

function BrandVsCompetitorCard({
  mentions,
  brandId,
}: {
  mentions: readonly EntityMentionDto[];
  brandId: string;
}) {
  const copy = REPORTS_COPY.dashboard.mentions;
  const filtered = mentions.filter((m) => m.mentionCount > 0);

  if (filtered.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.brandVsCompetitor}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        </CardContent>
      </Card>
    );
  }

  const data: BarChartDatum[] = filtered.map((m) => ({
    label: m.name,
    value: m.mentionCount,
  }));

  // Pick brand color when the tracked brand has rows; bar wrapper takes a
  // single color so we set it based on whether brand is the leader.
  const brandMentions = mentions.find((m) => m.entityId === brandId);
  const color =
    brandMentions && brandMentions.mentionCount > 0 ? entityColor(true, 0) : entityColor(false, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.brandVsCompetitor}</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartWrapper
          data={data}
          layout="horizontal"
          valueAxisLabel={copy.axisLabel}
          color={color}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mention distribution radar
// ---------------------------------------------------------------------------

function MentionDistributionCard({ mentions }: { mentions: readonly EntityMentionDto[] }) {
  const copy = REPORTS_COPY.dashboard.mentions;
  const data: RadarChartDatum[] = mentions
    .filter((m) => m.mentionCount > 0)
    .map((m) => ({ axis: m.name, value: m.mentionCount }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.distribution}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length < 3 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <RadarChartWrapper data={data} formatValue={(v) => String(Math.round(v))} />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Competitive Gap Analysis
// ---------------------------------------------------------------------------

function CompetitiveGapCard({ gaps }: { gaps: readonly CompetitiveGapDto[] }) {
  const copy = REPORTS_COPY.dashboard.competitiveGap;

  if (gaps.length === 0) {
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

  // Build a bar chart with one row per competitor, value = mentions gap.
  // Recommendations gap could be a second bar chart, but the headline is
  // mentions — keep the visual simple for v2. Recommendations gap surfaces
  // in the table form via RecommendationRateCard below.
  const data: BarChartDatum[] = gaps.map((g) => ({
    label: g.competitorName,
    value: g.mentionsGap,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartWrapper
          data={data}
          layout="horizontal"
          valueAxisLabel={copy.mentionsAxis}
          formatValue={(v) => `${v > 0 ? "+" : ""}${v}`}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recommendation rate by entity
// ---------------------------------------------------------------------------

function RecommendationRateCard({
  rates,
  brandId,
}: {
  rates: readonly EntityRateDto[];
  brandId: string;
}) {
  const copy = REPORTS_COPY.dashboard.recommendationRate;
  const filtered = rates.filter((r) => r.recommendationRate != null);

  if (filtered.length === 0) {
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

  const data: BarChartDatum[] = filtered.map((r) => ({
    label: `${r.name}${r.entityId === brandId ? " (You)" : ""}`,
    value: r.recommendationRate ?? 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartWrapper
          data={data}
          layout="horizontal"
          valueAxisLabel={copy.axisLabel}
          maxValue={1}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Top Citation Domains table
// ---------------------------------------------------------------------------

function TopCitationDomainsCard({ rows }: { rows: readonly DomainRowDto[] }) {
  const copy = REPORTS_COPY.dashboard.topDomains;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {copy.columns.source}
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
              {rows.map((row) => (
                <tr key={row.sourceId}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-neutral-900">{row.sourceName}</div>
                    {row.normalizedDomain && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                        <Globe className="h-3 w-3" aria-hidden="true" />
                        <span>{row.normalizedDomain}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <SourceTypeChip sourceType={row.sourceType} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-900">
                    {row.citationCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Color-coded chip per the 12-bucket SourceType taxonomy (Phase 4 v2
 * D11). Uses design tokens via badge variants.
 */
function SourceTypeChip({ sourceType }: { sourceType: string }) {
  const variant: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" =
    sourceType === "Owned"
      ? "success"
      : sourceType === "Competitor"
        ? "destructive"
        : sourceType === "Corporate"
          ? "warning"
          : sourceType === "Editorial"
            ? "default"
            : sourceType === "ReviewSite"
              ? "default"
              : sourceType === "Social"
                ? "default"
                : sourceType === "UGC"
                  ? "secondary"
                  : sourceType === "Institutional"
                    ? "outline"
                    : sourceType === "Reference"
                      ? "outline"
                      : sourceType === "Marketplace"
                        ? "secondary"
                        : "outline";
  return (
    <Badge variant={variant} className="text-xs">
      {sourceType}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Domain Types stacked bar
// ---------------------------------------------------------------------------

function DomainTypesCard({ rows }: { rows: readonly DomainTypeShareDto[] }) {
  const copy = REPORTS_COPY.dashboard.domainTypes;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DomainTypeStackedBar rows={rows} />
      </CardContent>
    </Card>
  );
}

/**
 * Horizontal stacked bar — one segment per SourceType with percentage of
 * total. Stable color per type uses the same chip-color mapping as the
 * table for visual consistency.
 */
function DomainTypeStackedBar({ rows }: { rows: readonly DomainTypeShareDto[] }) {
  return (
    <div className="space-y-3">
      <div className="flex h-4 w-full overflow-hidden rounded-md border border-neutral-200">
        {rows.map((row) => (
          <div
            key={row.sourceType}
            style={{ width: `${row.share * 100}%`, background: sourceTypeColor(row.sourceType) }}
            title={`${row.sourceType}: ${row.citationCount} (${Math.round(row.share * 100)}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700">
        {rows.map((row) => (
          <span key={row.sourceType} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: sourceTypeColor(row.sourceType) }}
            />
            <span>{row.sourceType}</span>
            <span className="tabular-nums text-neutral-500">{Math.round(row.share * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Hex-color mapping per the 12-bucket SourceType taxonomy. Aligns with
 * SourceTypeChip variants but emitted as raw hex for the stacked bar
 * (which is plain divs, not a Badge component).
 */
function sourceTypeColor(sourceType: string): string {
  switch (sourceType) {
    case "Owned":
      return "#10b981"; // emerald — semantic success
    case "Competitor":
      return "#ef4444"; // red — semantic error
    case "Corporate":
      return "#f59e0b"; // amber — semantic warning
    case "Editorial":
      return "#6366f1"; // primary
    case "ReviewSite":
      return "#8b5cf6"; // violet
    case "Social":
      return "#06b6d4"; // cyan
    case "UGC":
      return "#a3e635"; // lime
    case "Institutional":
      return "#737373"; // neutral-500
    case "Reference":
      return "#a3a3a3"; // neutral-400
    case "Marketplace":
      return "#ec4899"; // pink
    case "Other":
      return "#525252"; // neutral-600
    case "Unknown":
    default:
      return "#d4d4d4"; // neutral-300
  }
}

function entityColor(isTrackedBrand: boolean, index: number): string {
  if (isTrackedBrand) return ENTITY_PALETTE[0];
  // Skip index 0 (reserved for brand). Wrap competitors through index 1..5.
  return ENTITY_PALETTE[1 + (index % (ENTITY_PALETTE.length - 1))];
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  days: number;
  onDaysChange: (days: number) => void;
}

function FilterBar({ days, onDaysChange }: FilterBarProps) {
  const copy = REPORTS_COPY.dashboard.filter;
  const options: Array<{ days: number; label: string }> = [
    { days: 7, label: copy.day7 },
    { days: 30, label: copy.day30 },
    { days: 90, label: copy.day90 },
  ];
  return (
    <div
      role="group"
      aria-label={copy.ariaLabel}
      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-surface-card p-1"
    >
      {options.map((opt) => (
        <button
          key={opt.days}
          type="button"
          onClick={() => onDaysChange(opt.days)}
          aria-pressed={days === opt.days}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition-colors",
            days === opt.days
              ? "bg-primary-50 text-primary-700"
              : "text-neutral-600 hover:bg-neutral-50",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero tiles (4 big numbers)
// ---------------------------------------------------------------------------

interface HeroRowProps {
  hero: TrackerDashboardDto["hero"];
}

function HeroRow({ hero }: HeroRowProps) {
  const copy = REPORTS_COPY.dashboard.hero;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <HeroTile label={copy.queries} value={hero.queries.toLocaleString()} />
      <HeroTile label={copy.mentions} value={hero.mentions.toLocaleString()} />
      <HeroTile label={copy.citations} value={hero.citations.toLocaleString()} />
      <HeroTile
        label={copy.brandMentionRate}
        value={
          hero.brandMentionRate == null
            ? copy.noData
            : `${Math.round(hero.brandMentionRate * 100)}%`
        }
        muted={hero.brandMentionRate == null}
      />
    </div>
  );
}

function HeroTile({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
        <div
          className={cn(
            "mt-2 text-3xl font-semibold tabular-nums",
            muted ? "text-neutral-400" : "text-neutral-900",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Multi-line trend chart with metric switcher
// ---------------------------------------------------------------------------

interface TrendChartCardProps {
  data: TrackerDashboardDto;
  metricKey: string;
  onMetricKeyChange: (key: string) => void;
}

function TrendChartCard({ data, metricKey, onMetricKeyChange }: TrendChartCardProps) {
  const copy = REPORTS_COPY.dashboard.trend;
  const option = METRIC_OPTIONS.find((m) => m.value === metricKey) ?? METRIC_OPTIONS[0];

  // Build one series per entity. The brand entity uses option.brandMetric;
  // competitor entities use option.competitorMetric.
  const series = useMemo(
    () => buildSeries(data, option.brandMetric, option.competitorMetric),
    [data, option],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{copy.title}</CardTitle>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <span>{copy.metricLabel}</span>
          <select
            value={metricKey}
            onChange={(e) => onMetricKeyChange(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm"
          >
            {METRIC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <LineChartWrapper
            series={series}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            maxValue={1}
            height={300}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Pivots the dashboard's flat per-(entity, metric) series array into one
 * LineChartSeries per entity, selecting the brand-metric for the brand
 * entity and the competitor-metric for competitor entities. Sorted with
 * tracked brand first so its color is stable (primary palette index 0).
 */
function buildSeries(
  data: TrackerDashboardDto,
  brandMetric: string,
  competitorMetric: string,
): LineChartSeries[] {
  type Acc = {
    entityId: string;
    name: string;
    isTrackedBrand: boolean;
    points: LineChartPoint[];
  };
  const byEntity = new Map<string, Acc>();

  for (const s of data.series) {
    const wantMetric = s.entityType === "Brand" ? brandMetric : competitorMetric;
    if (s.metricName !== wantMetric) continue;
    if (s.seriesKind !== "Numeric") continue;

    const key = `${s.entityType}:${s.entityId}`;
    if (!byEntity.has(key)) {
      byEntity.set(key, {
        entityId: s.entityId,
        name: s.entityName,
        isTrackedBrand: s.entityType === "Brand" && s.entityId === data.brandId,
        points: [],
      });
    }
    const acc = byEntity.get(key)!;
    for (const p of s.points) {
      acc.points.push({ x: formatShortDate(p.capturedAt), y: p.value });
    }
  }

  const entities = Array.from(byEntity.values());
  entities.sort((a, b) => {
    if (a.isTrackedBrand !== b.isTrackedBrand) return a.isTrackedBrand ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entities.map((e, i) => ({
    id: e.entityId,
    name: e.name,
    color: ENTITY_PALETTE[i % ENTITY_PALETTE.length],
    data: e.points,
  }));
}

// ---------------------------------------------------------------------------
// Top Brands table
// ---------------------------------------------------------------------------

interface TopBrandsCardProps {
  rows: readonly TopBrandRowDto[];
}

function TopBrandsCard({ rows }: TopBrandsCardProps) {
  const copy = REPORTS_COPY.dashboard.topBrands;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    {copy.columns.brand}
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
                {rows.map((row) => (
                  <tr key={`${row.entityType}:${row.entityId}`} className="hover:bg-neutral-50">
                    <td className="px-4 py-2">
                      <span className="font-medium text-neutral-900">{row.name}</span>
                      {row.isTrackedBrand && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {copy.youChip}
                        </Badge>
                      )}
                    </td>
                    <MetricCell value={row.visibility} delta={row.visibilityDelta} format="pct" />
                    <MetricCell
                      value={row.shareOfVoice}
                      delta={row.shareOfVoiceDelta}
                      format="pct"
                    />
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

interface MetricCellProps {
  value: number | null;
  delta: number | null;
  format: "pct";
}
function MetricCell({ value, delta, format: _format }: MetricCellProps) {
  const copy = REPORTS_COPY.dashboard.topBrands;
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

interface DeltaChipProps {
  delta: number;
}
function DeltaChip({ delta }: DeltaChipProps) {
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
      return "warning";
    case "Mixed":
      return "warning";
    case "Neutral":
    case "Unknown":
    default:
      return "secondary";
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
