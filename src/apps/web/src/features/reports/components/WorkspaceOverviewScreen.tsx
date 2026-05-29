import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Globe,
  Grid3X3,
  Layers,
  Loader2,
  MessageSquare,
  Minus,
  PieChart,
  Smile,
  Target,
  ThumbsUp,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { AudienceSelector } from "@/components/molecules/AudienceSelector";
import { CollapsibleCard } from "@/components/molecules/CollapsibleCard";
import {
  DateGranularityToggle,
  type DateGranularity,
} from "@/components/molecules/DateGranularityToggle";
import { LensChipRow } from "@/components/molecules/LensChipRow";
import { TrustSignalsPill } from "@/components/molecules/TrustSignalsPill";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { sentimentColors } from "@/components/charts/chartTheme";
import { DonutChartWrapper, type DonutChartDatum } from "@/components/charts/DonutChartWrapper";
import { HeatmapWrapper, type HeatmapData } from "@/components/charts/HeatmapWrapper";
import { LineChartWrapper, type LineChartSeries } from "@/components/charts/LineChartWrapper";
import { RadarChartWrapper, type RadarChartDatum } from "@/components/charts/RadarChartWrapper";
import {
  DateRangePicker,
  defaultDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { MarketSelector } from "@/components/molecules/MarketSelector";
import { ProductSelector } from "@/components/molecules/ProductSelector";
import { TopicSelector } from "@/components/molecules/TopicSelector";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { BrandSelector, type BrandSelectorEntity } from "@/components/molecules/BrandSelector";
import { REPORTS_COPY } from "@/content/reports";
import { useDiscoverySummary } from "@/features/reports/hooks/useDiscoverySummary";
import { useAudienceCounts } from "@/features/reports/hooks/useAudienceCounts";
import { useLensCounts } from "@/features/reports/hooks/useLensCounts";
import { useMarketCounts } from "@/features/reports/hooks/useMarketCounts";
import { useProductCounts } from "@/features/reports/hooks/useProductCounts";
import { useTopicCounts } from "@/features/reports/hooks/useTopicCounts";
import { useWorkspaceCompetitive } from "@/features/reports/hooks/useWorkspaceCompetitive";
import { useWorkspaceDepth } from "@/features/reports/hooks/useWorkspaceDepth";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import { bucketTrendPoints } from "@/lib/trendBucketing";
import { cn } from "@/lib/utils";
import type {
  BrandCompetitiveGapGroupDto,
  CompetitiveGapDto,
  DomainRowDto,
  DomainTypeShareDto,
  EntityMentionDto,
  EntityRateDto,
  EntityTrendSeriesDto,
  TopicHeatmapDto,
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

// Metric switcher options. Each entry names the trend metric on the
// brand side and (when applicable) the per-competitor analogue. Brand-
// only metrics (SoV / OwnedCitationShare / AverageBrandRank / Sentiment)
// have no competitorMetric — only the tracked brands render lines.
//
// `format` drives chart shape selection + Y-axis configuration:
//  - "pct" — line chart, 0..1 scale, % labels
//  - "rank" — line chart, minValue=1, reverseY (1 at top), integer labels
//  - "sentiment" — colored-markers timeline (line chart is replaced
//                  entirely because sentiment is categorical)
type MetricFormat = "pct" | "rank" | "sentiment";
interface MetricOption {
  value: string;
  label: string;
  brandMetric: string;
  /** Optional — omitted for brand-only metrics. */
  competitorMetric?: string;
  format: MetricFormat;
}

const METRIC_OPTIONS: MetricOption[] = [
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
  {
    value: "sov",
    label: "Share of voice",
    brandMetric: "BrandShareOfVoice",
    format: "pct",
  },
  {
    value: "owned",
    label: "Owned citation share",
    brandMetric: "OwnedCitationShare",
    format: "pct",
  },
  {
    value: "rank",
    label: "Average brand rank",
    brandMetric: "AverageBrandRank",
    format: "rank",
  },
  {
    value: "sentiment",
    label: "Sentiment",
    brandMetric: "OverallSentiment",
    format: "sentiment",
  },
];

/**
 * Phase 4 v3 Slice A — Workspace Overview screen at `/overview`. Aggregates
 * the last N days of scans across every tracked brand + every tracker in
 * the workspace. Brand selector filters which entities flow through the
 * trend chart + Top Entities table.
 */
export function WorkspaceOverviewScreen() {
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // FE-only lens-filter state — both variants below write to this list.
  // No data fetch honors it yet; once we settle on one variant we will
  // wire `?lensCodes=` through the overview endpoints.
  const [selectedLensCodes, setSelectedLensCodes] = useState<string[]>([]);
  const [selectedTopicNames, setSelectedTopicNames] = useState<string[]>([]);
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const [selectedMarketNames, setSelectedMarketNames] = useState<string[]>([]);
  const [selectedAudienceNames, setSelectedAudienceNames] = useState<string[]>([]);
  // Chart-granularity toggle (D/W/M). The BE returns per-scan points;
  // we re-bucket them FE-side in `TrendCard` via `bucketTrendPoints` so
  // flipping D/W/M is instant and doesn't refetch.
  const [granularity, setGranularity] = useState<DateGranularity>("day");
  const [allSelectedInit, setAllSelectedInit] = useState(false);
  // Per-metric refs let hero tiles scroll to the matching trend card.
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { data, isLoading, isFetching, isError, error, refetch } = useWorkspaceOverview(
    range,
    selectedLensCodes,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
  );
  // Per-lens mention counts for the chip in the LensSelector. Unscoped
  // from `selectedLensCodes` on purpose so the chip stays stable as the
  // user toggles. Fold the array into a code→count map once.
  const { data: lensCountsRaw } = useLensCounts(range);
  const lensCountsByCode = useMemo<Record<string, number>>(() => {
    if (!lensCountsRaw) return {};
    return Object.fromEntries(lensCountsRaw.map((l) => [l.lensCode, l.mentionCount]));
  }, [lensCountsRaw]);
  // Per-topic mention counts — drives the chip on each row of the
  // TopicSelector dropdown. Same stability rules as `useLensCounts`.
  const { data: topicCountsRaw } = useTopicCounts(range);
  const topicCountsByName = useMemo<Record<string, number>>(() => {
    if (!topicCountsRaw) return {};
    return Object.fromEntries(topicCountsRaw.map((t) => [t.topicName, t.mentionCount]));
  }, [topicCountsRaw]);
  const { data: productCountsRaw } = useProductCounts(range);
  const productCountsByName = useMemo<Record<string, number>>(() => {
    if (!productCountsRaw) return {};
    return Object.fromEntries(productCountsRaw.map((p) => [p.productName, p.mentionCount]));
  }, [productCountsRaw]);
  const { data: marketCountsRaw } = useMarketCounts(range);
  const marketCountsByName = useMemo<Record<string, number>>(() => {
    if (!marketCountsRaw) return {};
    return Object.fromEntries(marketCountsRaw.map((m) => [m.marketName, m.mentionCount]));
  }, [marketCountsRaw]);
  const { data: audienceCountsRaw } = useAudienceCounts(range);
  const audienceCountsByName = useMemo<Record<string, number>>(() => {
    if (!audienceCountsRaw) return {};
    return Object.fromEntries(audienceCountsRaw.map((a) => [a.audienceName, a.mentionCount]));
  }, [audienceCountsRaw]);
  // Discovery summary — names/counts for products, markets, audiences,
  // topics, trust signals. Drives the inline strip near the top + supplies
  // the topic-name list to the TopicSelector dropdown.
  const { data: discoverySummary } = useDiscoverySummary();
  const allTopicNames = useMemo<string[]>(
    () => discoverySummary?.topics.map((t) => t.name) ?? [],
    [discoverySummary],
  );
  const allProductNames = useMemo<string[]>(
    () => discoverySummary?.products.map((p) => p.name) ?? [],
    [discoverySummary],
  );
  const allMarketNames = useMemo<string[]>(
    () => discoverySummary?.markets.map((m) => m.name) ?? [],
    [discoverySummary],
  );
  const allAudienceNames = useMemo<string[]>(
    () => discoverySummary?.audiences.map((a) => a.name) ?? [],
    [discoverySummary],
  );
  const allTrustSignalNames = useMemo<string[]>(
    () => discoverySummary?.trustSignals.map((ts) => ts.name) ?? [],
    [discoverySummary],
  );
  const copy = REPORTS_COPY.overview;

  /** Hero-tile drill-down. Scrolls to the trend card for the chosen metric. */
  function handleHeroDrillDown(metric: string) {
    const el = chartRefs.current[metric];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

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
      <PageHeader title={copy.title} description={copy.subtitle} />

      <ComparisonControlsRow
        range={range}
        onRangeChange={setRange}
        granularity={granularity}
        onGranularityChange={setGranularity}
        trackedBrands={trackedBrandsEntities}
        competitors={competitorEntities}
        selectedKeys={selectedKeys}
        onSelectedKeysChange={setSelectedKeys}
        selectedLensCodes={selectedLensCodes}
        onSelectedLensCodesChange={setSelectedLensCodes}
        lensCountsByCode={lensCountsByCode}
        allTopicNames={allTopicNames}
        selectedTopicNames={selectedTopicNames}
        onSelectedTopicNamesChange={setSelectedTopicNames}
        topicCountsByName={topicCountsByName}
        allProductNames={allProductNames}
        selectedProductNames={selectedProductNames}
        onSelectedProductNamesChange={setSelectedProductNames}
        productCountsByName={productCountsByName}
        allMarketNames={allMarketNames}
        selectedMarketNames={selectedMarketNames}
        onSelectedMarketNamesChange={setSelectedMarketNames}
        marketCountsByName={marketCountsByName}
        allAudienceNames={allAudienceNames}
        selectedAudienceNames={selectedAudienceNames}
        onSelectedAudienceNamesChange={setSelectedAudienceNames}
        audienceCountsByName={audienceCountsByName}
        allTrustSignalNames={allTrustSignalNames}
        isRefreshing={isFetching && !isLoading}
      />

      {data.trackedBrands.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            {copy.empty.noBrands}
          </CardContent>
        </Card>
      ) : (
        // Soft dim while a refetch is in flight. `placeholderData` keeps the
        // prior payload mounted so nothing actually swaps in — the dim is the
        // only visual signal that fresh data is on the way (plus the spinner
        // in the control bar above).
        <div
          aria-busy={isFetching && !isLoading}
          className={cn(
            "space-y-6 transition-opacity duration-150",
            isFetching && !isLoading && "opacity-60",
          )}
        >
          <HeroRow
            hero={data.hero}
            previousHero={data.previousHero}
            onDrillDown={handleHeroDrillDown}
          />
          <TrendChartsGrid
            data={data}
            selectedKeys={selectedKeys}
            granularity={granularity}
            registerRef={(metric, el) => {
              chartRefs.current[metric] = el;
            }}
          />
          <TopEntitiesCard rows={data.topEntities} selectedKeys={selectedKeys} />

          {/* Slice B competitive sections — fetched separately so an
              aggregation failure in one doesn't blank the whole page. */}
          <CompetitiveSections
            range={range}
            lensCodes={selectedLensCodes}
            topicNames={selectedTopicNames}
            productNames={selectedProductNames}
            marketNames={selectedMarketNames}
            audienceNames={selectedAudienceNames}
            selectedKeys={selectedKeys}
          />

          {/* Slice C depth sections + recent chats. Same pattern. */}
          <DepthSections
            range={range}
            lensCodes={selectedLensCodes}
            topicNames={selectedTopicNames}
            productNames={selectedProductNames}
            marketNames={selectedMarketNames}
            audienceNames={selectedAudienceNames}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slice B sections — fetched from /api/overview/competitive
// ---------------------------------------------------------------------------

function CompetitiveSections({
  range,
  lensCodes,
  topicNames,
  productNames,
  marketNames,
  audienceNames,
  selectedKeys,
}: {
  range: DateRangeSelection;
  lensCodes: readonly string[];
  topicNames: readonly string[];
  productNames: readonly string[];
  marketNames: readonly string[];
  audienceNames: readonly string[];
  selectedKeys: readonly string[];
}) {
  const { data, isLoading, isError } = useWorkspaceCompetitive(
    range,
    lensCodes,
    topicNames,
    productNames,
    marketNames,
    audienceNames,
  );
  if (isLoading || isError || !data) return null;

  return (
    <>
      <ShareOfVoiceCard mentions={data.mentionDistribution} selectedKeys={selectedKeys} />
      <RecommendationRateCard rates={data.recommendationRates} selectedKeys={selectedKeys} />
      <BrandVsCompetitorCard mentions={data.mentionDistribution} selectedKeys={selectedKeys} />
      <MentionDistributionCard mentions={data.mentionDistribution} selectedKeys={selectedKeys} />
      <CompetitiveGapGroupsCard groups={data.competitiveGaps} selectedKeys={selectedKeys} />
      <TopCitationDomainsCard rows={data.topDomains} />
      <DomainTypesCard rows={data.domainTypes} />
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
        height={260}
      />
    </CollapsibleCard>
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
    <CollapsibleCard icon={BarChart3} title={copy.brandVsCompetitor} tooltip={copy.tooltip}>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      ) : (
        <BarChartWrapper data={data} valueAxisLabel={copy.axisLabel} />
      )}
    </CollapsibleCard>
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
    <CollapsibleCard icon={Users} title={copy.distribution} tooltip={copy.tooltip}>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      ) : (
        <RadarChartWrapper data={data} />
      )}
    </CollapsibleCard>
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

// ---------------------------------------------------------------------------
// Top citation domains table — workspace-wide; not filtered by selector
// ---------------------------------------------------------------------------

function TopCitationDomainsCard({ rows }: { rows: readonly DomainRowDto[] }) {
  const copy = REPORTS_COPY.overview.topDomains;
  return (
    <CollapsibleCard icon={Globe} title={copy.title} tooltip={copy.tooltip}>
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
    </CollapsibleCard>
  );
}

// ---------------------------------------------------------------------------
// Domain types donut — workspace-wide; not filtered by selector
// ---------------------------------------------------------------------------

function DomainTypesCard({ rows }: { rows: readonly DomainTypeShareDto[] }) {
  const copy = REPORTS_COPY.overview.domainTypes;
  if (rows.length === 0) {
    return (
      <CollapsibleCard icon={Layers} title={copy.title} tooltip={copy.tooltip}>
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      </CollapsibleCard>
    );
  }

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
        formatValue={(v) =>
          `${v} (${Math.round((v / rows.reduce((s, r) => s + r.citationCount, 0)) * 100)}%)`
        }
        height={260}
      />
    </CollapsibleCard>
  );
}

// ---------------------------------------------------------------------------
// Comparison controls row — brand selector + date-range picker
// ---------------------------------------------------------------------------

interface ComparisonControlsRowProps {
  range: DateRangeSelection;
  onRangeChange: (next: DateRangeSelection) => void;
  granularity: DateGranularity;
  onGranularityChange: (next: DateGranularity) => void;
  trackedBrands: readonly BrandSelectorEntity[];
  competitors: readonly BrandSelectorEntity[];
  selectedKeys: readonly string[];
  onSelectedKeysChange: (next: string[]) => void;
  selectedLensCodes: readonly string[];
  onSelectedLensCodesChange: (next: string[]) => void;
  lensCountsByCode?: Readonly<Record<string, number>>;
  /** Workspace's topic-name universe (deduplicated). */
  allTopicNames: readonly string[];
  selectedTopicNames: readonly string[];
  onSelectedTopicNamesChange: (next: string[]) => void;
  topicCountsByName?: Readonly<Record<string, number>>;
  /** Workspace's product-name universe (deduplicated). */
  allProductNames: readonly string[];
  selectedProductNames: readonly string[];
  onSelectedProductNamesChange: (next: string[]) => void;
  productCountsByName?: Readonly<Record<string, number>>;
  /** Workspace's market-name universe (deduplicated). */
  allMarketNames: readonly string[];
  selectedMarketNames: readonly string[];
  onSelectedMarketNamesChange: (next: string[]) => void;
  marketCountsByName?: Readonly<Record<string, number>>;
  /** Workspace's audience-name universe (deduplicated). */
  allAudienceNames: readonly string[];
  selectedAudienceNames: readonly string[];
  onSelectedAudienceNamesChange: (next: string[]) => void;
  audienceCountsByName?: Readonly<Record<string, number>>;
  /** Workspace's trust-signal names — informational only (no filter). */
  allTrustSignalNames: readonly string[];
  /** True while a new date range is fetching (placeholderData kept the
   *  prior payload visible). Drives a tiny spinner inside the bar so the
   *  user knows fresh data is on its way. */
  isRefreshing?: boolean;
}

function ComparisonControlsRow({
  range,
  onRangeChange,
  granularity,
  onGranularityChange,
  trackedBrands,
  competitors,
  selectedKeys,
  onSelectedKeysChange,
  selectedLensCodes,
  onSelectedLensCodesChange,
  lensCountsByCode,
  allTopicNames,
  selectedTopicNames,
  onSelectedTopicNamesChange,
  topicCountsByName,
  allProductNames,
  selectedProductNames,
  onSelectedProductNamesChange,
  productCountsByName,
  allMarketNames,
  selectedMarketNames,
  onSelectedMarketNamesChange,
  marketCountsByName,
  allAudienceNames,
  selectedAudienceNames,
  onSelectedAudienceNamesChange,
  audienceCountsByName,
  allTrustSignalNames,
  isRefreshing = false,
}: ComparisonControlsRowProps) {
  return (
    // Sticky filter region with two side-by-side columns:
    //   - LEFT  : a narrow Time column — D/W/M granularity stacked above
    //             the date-range picker. Stretches to match the height
    //             of the right column.
    //   - RIGHT : flex-1; stacks the Lenses row above the Trackers row
    //             so both dimension groups share the same horizontal
    //             space and headings line up consistently.
    // Both columns wrap internally (flex-wrap), so the page never needs
    // a horizontal scrollbar regardless of how many dimensions land in
    // them.
    <div className="sticky top-0 z-20 flex flex-wrap items-stretch gap-2">
      <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <DateGranularityToggle value={granularity} onChange={onGranularityChange} />
        <DateRangePicker value={range} onChange={onRangeChange} />
      </div>

      <div className="flex min-w-[24rem] flex-1 flex-col gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 shadow-sm">
          <span className="shrink-0 pr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Lenses
          </span>
          <LensChipRow
            selectedCodes={selectedLensCodes}
            onChange={onSelectedLensCodesChange}
            countsByCode={lensCountsByCode}
          />
          {isRefreshing && (
            <span
              aria-live="polite"
              aria-label="Refreshing"
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs text-neutral-500"
            >
              <Loader2 size={14} className="animate-spin text-primary-500" aria-hidden />
              Refreshing…
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 shadow-sm">
          <span className="shrink-0 pr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Trackers
          </span>
          <BrandSelector
            trackedBrands={trackedBrands}
            competitors={competitors}
            selectedKeys={selectedKeys}
            onChange={onSelectedKeysChange}
          />
          <TopicSelector
            allTopicNames={allTopicNames}
            selectedNames={selectedTopicNames}
            onChange={onSelectedTopicNamesChange}
            countsByName={topicCountsByName}
          />
          <ProductSelector
            allProductNames={allProductNames}
            selectedNames={selectedProductNames}
            onChange={onSelectedProductNamesChange}
            countsByName={productCountsByName}
          />
          <MarketSelector
            allMarketNames={allMarketNames}
            selectedNames={selectedMarketNames}
            onChange={onSelectedMarketNamesChange}
            countsByName={marketCountsByName}
          />
          <AudienceSelector
            allAudienceNames={allAudienceNames}
            selectedNames={selectedAudienceNames}
            onChange={onSelectedAudienceNamesChange}
            countsByName={audienceCountsByName}
          />
          <TrustSignalsPill allNames={allTrustSignalNames} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero tiles
// ---------------------------------------------------------------------------

function HeroRow({
  hero,
  previousHero,
  onDrillDown,
}: {
  hero: WorkspaceHeroDto;
  previousHero: WorkspaceHeroDto | null;
  onDrillDown: (metric: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <HeroTile
        label="Queries"
        value={hero.queries.toLocaleString()}
        current={hero.queries}
        previous={previousHero?.queries ?? null}
        onClick={() => onDrillDown("mention")}
      />
      <HeroTile
        label="Mentions"
        value={hero.mentions.toLocaleString()}
        current={hero.mentions}
        previous={previousHero?.mentions ?? null}
        onClick={() => onDrillDown("mention")}
      />
      <HeroTile
        label="Citations"
        value={hero.citations.toLocaleString()}
        current={hero.citations}
        previous={previousHero?.citations ?? null}
        onClick={() => onDrillDown("owned")}
      />
      <HeroTile
        label="Brand mention rate"
        value={hero.brandMentionRate == null ? "—" : `${Math.round(hero.brandMentionRate * 100)}%`}
        current={hero.brandMentionRate}
        previous={previousHero?.brandMentionRate ?? null}
        onClick={() => onDrillDown("mention")}
      />
    </div>
  );
}

function HeroTile({
  label,
  value,
  current,
  previous,
  onClick,
}: {
  label: string;
  value: string;
  /** Raw numeric current value used to derive the delta chip. */
  current: number | null;
  /** Equivalent previous-window value. Null = no delta to show. */
  previous: number | null;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-neutral-900">{value}</p>
        <HeroDelta current={current} previous={previous} />
      </div>
    </>
  );
  if (!onClick) {
    return (
      <Card>
        <CardContent className="p-4">{inner}</CardContent>
      </Card>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View trend by ${label}`}
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-4 text-left shadow-sm transition",
        "hover:border-primary-300 hover:bg-primary-50/30",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400",
      )}
    >
      {inner}
    </button>
  );
}

/**
 * Small inline delta chip — up/down arrow + relative % vs the equivalent
 * previous window. Hidden when there is no previous (e.g. "All time"),
 * when both values are zero, or when the rounded change is 0%. Treats
 * previous=0 + current>0 as "New" — relative % change is undefined when
 * the baseline is zero, so we surface that as a positive signal instead
 * of dividing by zero.
 */
function HeroDelta({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-semantic-success-600">
        <ArrowUp size={12} aria-hidden /> New
      </span>
    );
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return null;
  const isUp = rounded > 0;
  return (
    <span
      aria-label={`${isUp ? "Up" : "Down"} ${Math.abs(rounded)} percent vs previous period`}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isUp ? "text-semantic-success-600" : "text-semantic-error-600",
      )}
    >
      {isUp ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />}
      {Math.abs(rounded)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Trend charts grid — one card per metric (no dropdown). 2-col on lg+.
// ---------------------------------------------------------------------------

interface TrendChartsGridProps {
  data: WorkspaceOverviewDto;
  selectedKeys: readonly string[];
  /** Chart-axis granularity from the D/W/M toggle. */
  granularity: DateGranularity;
  /** Registers per-metric DOM refs so the hero-tile drill-down can scroll. */
  registerRef: (metricValue: string, el: HTMLDivElement | null) => void;
}

function TrendChartsGrid({ data, selectedKeys, granularity, registerRef }: TrendChartsGridProps) {
  return (
    <div className="grid gap-4">
      {METRIC_OPTIONS.map((metric) => (
        <div
          key={metric.value}
          ref={(el) => registerRef(metric.value, el)}
          className="scroll-mt-4"
          data-testid={`trend-card-${metric.value}`}
        >
          <TrendCard
            data={data}
            metric={metric}
            selectedKeys={selectedKeys}
            granularity={granularity}
          />
        </div>
      ))}
    </div>
  );
}

function TrendCard({
  data,
  metric,
  selectedKeys,
  granularity,
}: {
  data: WorkspaceOverviewDto;
  metric: MetricOption;
  selectedKeys: readonly string[];
  granularity: DateGranularity;
}) {
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const filteredSeries = useMemo(() => {
    return data.series.filter((s) => {
      const k = `${s.entityType}:${s.entityId}`;
      if (!selectedSet.has(k)) return false;
      if (s.entityType === "Brand") return s.metricName === metric.brandMetric;
      if (!metric.competitorMetric) return false;
      return s.metricName === metric.competitorMetric;
    });
  }, [data.series, metric, selectedSet]);

  // FE-side bucketing: re-aggregate per-scan points into weekly/monthly
  // buckets when the toggle isn't "day". The BE always returns per-scan
  // points; bucketing here keeps the toggle interactive and avoids a
  // round-trip on every D/W/M flip.
  const bucketedSeries = useMemo(
    () =>
      filteredSeries.map((s) => ({
        ...s,
        points: bucketTrendPoints(s.points, granularity),
      })),
    [filteredSeries, granularity],
  );

  return (
    <CollapsibleCard
      icon={metric.format === "sentiment" ? Smile : TrendingUp}
      title={metric.label}
      tooltip={REPORTS_COPY.overview.trendChart.tooltip}
    >
      {bucketedSeries.length === 0 ? (
        <p className="text-sm text-neutral-500">No trend data in the selected window yet.</p>
      ) : metric.format === "sentiment" ? (
        <SentimentTimeline series={bucketedSeries} granularity={granularity} />
      ) : (
        <NumericTrendChart
          series={bucketedSeries}
          format={metric.format}
          granularity={granularity}
        />
      )}
    </CollapsibleCard>
  );
}

function NumericTrendChart({
  series,
  format,
  granularity,
}: {
  series: readonly EntityTrendSeriesDto[];
  format: Exclude<MetricFormat, "sentiment">;
  granularity: DateGranularity;
}) {
  const axis = axisConfigForFormat(format);
  const formatX = (iso: string) => formatBucketLabel(iso, granularity);
  const chartSeries: LineChartSeries[] = series.map((s, i) => ({
    id: s.entityId,
    name: s.entityName,
    color: entityColor(s.entityType === "Brand", i),
    data: s.points.map((p) => ({ x: p.capturedAt, y: p.value ?? null })),
  }));
  return (
    <LineChartWrapper
      series={chartSeries}
      formatValue={axis.formatValue}
      formatX={formatX}
      maxValue={axis.maxValue}
      minValue={axis.minValue}
      reverseY={axis.reverseY}
    />
  );
}

/**
 * Returns the Y-axis configuration (range + label format + reversed?)
 * for numeric metric formats. Sentiment is excluded — it renders via
 * SentimentTimeline instead of LineChartWrapper.
 */
function axisConfigForFormat(format: "pct" | "rank"): {
  formatValue: (v: number) => string;
  maxValue?: number;
  minValue?: number;
  reverseY?: boolean;
} {
  switch (format) {
    case "pct":
      // No maxValue cap — let Recharts auto-scale the Y axis to a nice
      // round value above the data max so small percentages don't get
      // lost in a 0-100% band.
      return { formatValue: (v) => `${Math.round(v * 100)}%`, minValue: 0 };
    case "rank":
      // Rank 1 = best; flip the axis so "up = better" reads naturally.
      return {
        formatValue: (v) => v.toFixed(1),
        minValue: 1,
        reverseY: true,
      };
  }
}

// ---------------------------------------------------------------------------
// Sentiment timeline — categorical visualization for the OverallSentiment
// trend. One row per entity, colored markers for each scan's mode.
// ---------------------------------------------------------------------------

function SentimentTimeline({
  series,
  granularity,
}: {
  series: readonly EntityTrendSeriesDto[];
  granularity: DateGranularity;
}) {
  if (series.length === 0) return null;
  return (
    <div className="space-y-3">
      {series.map((s) => (
        <SentimentRow key={s.entityId} series={s} granularity={granularity} />
      ))}
      <SentimentLegend />
    </div>
  );
}

function SentimentRow({
  series,
  granularity,
}: {
  series: EntityTrendSeriesDto;
  granularity: DateGranularity;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-28 shrink-0 truncate text-xs font-medium text-neutral-700"
        title={series.entityName}
      >
        {series.entityName}
      </div>
      <div className="flex flex-1 items-center gap-2 overflow-x-auto py-1">
        {series.points.map((p) => {
          const category = p.category ?? "Unknown";
          const color = sentimentColors[category] ?? sentimentColors.Unknown;
          const label = formatBucketLabel(p.capturedAt, granularity);
          return (
            <div
              key={p.scanRunId}
              className="flex flex-col items-center gap-1"
              title={`${label} — ${category}`}
            >
              <span
                className="h-4 w-4 rounded-full ring-1 ring-inset ring-neutral-900/10"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-neutral-500">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SentimentLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-2 text-xs text-neutral-600">
      {(["Positive", "Neutral", "Mixed", "Negative", "Unknown"] as const).map((label) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: sentimentColors[label] ?? sentimentColors.Unknown }}
            aria-hidden="true"
          />
          {label}
        </span>
      ))}
    </div>
  );
}

/**
 * Renders the bucket-start ISO that comes back from `bucketTrendPoints`
 * (or a per-scan capturedAt when granularity is "day") in a label that
 * matches the toggle: "May 28" for day/week, "May 2026" for month.
 */
function formatBucketLabel(iso: string, granularity: DateGranularity): string {
  try {
    const d = new Date(iso);
    if (granularity === "month") {
      return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
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
    <CollapsibleCard icon={Trophy} title={copy.title} tooltip={copy.tooltip}>
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
                      <div className="flex items-center gap-2">
                        <Badge variant={sentimentVariant(row.sentiment)} className="text-xs">
                          {row.sentiment}
                        </Badge>
                        {row.sentimentDelta != null && (
                          <SentimentDeltaChip delta={row.sentimentDelta} />
                        )}
                      </div>
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
    </CollapsibleCard>
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

/**
 * Sentiment Δ chip. Values are points on the [-2, +2] sentiment-score
 * axis (Positive=+1, Neutral/Mixed=0, Negative=−1). Renders as an arrow
 * + a short label ("+1pt") with success/error color coding.
 */
function SentimentDeltaChip({ delta }: { delta: number }) {
  const rounded = Math.round(delta);
  const sign = rounded > 0 ? "+" : "";
  const Icon = rounded > 0 ? ArrowUp : rounded < 0 ? ArrowDown : Minus;
  const color =
    rounded > 0
      ? "text-semantic-success-700"
      : rounded < 0
        ? "text-semantic-error-700"
        : "text-neutral-500";
  const noun = Math.abs(rounded) === 1 ? "pt" : "pts";
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-xs tabular-nums", color)}
      title="Sentiment score change vs the previous scan"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {sign}
      {rounded}
      {noun}
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

function DepthSections({
  range,
  lensCodes,
  topicNames,
  productNames,
  marketNames,
  audienceNames,
}: {
  range: DateRangeSelection;
  lensCodes: readonly string[];
  topicNames: readonly string[];
  productNames: readonly string[];
  marketNames: readonly string[];
  audienceNames: readonly string[];
}) {
  const { data, isLoading, isError } = useWorkspaceDepth(
    range,
    lensCodes,
    topicNames,
    productNames,
    marketNames,
    audienceNames,
  );
  const [selectedChat, setSelectedChat] = useState<WorkspaceRecentChatDto | null>(null);

  if (isLoading || isError || !data) return null;

  return (
    <>
      <MentionsByPlatformCard rows={data.mentionsByPlatform} />
      <SentimentDistributionCard slices={data.sentimentDistribution} />
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
    <CollapsibleCard icon={BarChart3} title={copy.title} tooltip={copy.tooltip}>
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

function SentimentDistributionCard({ slices }: { slices: readonly SentimentSliceDto[] }) {
  const copy = REPORTS_COPY.overview.sentiment;
  const data: DonutChartDatum[] = slices.map((s) => ({
    id: s.sentiment,
    label: s.sentiment,
    value: s.count,
    color: sentimentColors[s.sentiment] ?? sentimentColors.Unknown,
  }));
  return (
    <CollapsibleCard icon={Smile} title={copy.title} tooltip={copy.tooltip}>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      ) : (
        <DonutChartWrapper data={data} />
      )}
    </CollapsibleCard>
  );
}

type TopicMetric = "answers" | "citations";

function TopicHeatmapCard({ heatmap }: { heatmap: TopicHeatmapDto }) {
  const copy = REPORTS_COPY.overview.topicCoverage;
  const [metric, setMetric] = useState<TopicMetric>("answers");

  const data: HeatmapData = useMemo(
    () => ({
      rows: [...heatmap.rows],
      cols: [...heatmap.columns],
      cells: heatmap.cells.map((c) => ({
        row: c.row,
        col: c.column,
        value: metric === "answers" ? c.answerCount : c.citationCount,
      })),
    }),
    [heatmap, metric],
  );

  const empty = data.rows.length === 0 || data.cols.length === 0;

  return (
    <CollapsibleCard
      icon={Grid3X3}
      title={copy.title}
      subtitle={copy.subtitle}
      tooltip={copy.tooltip}
      actions={!empty ? <TopicMetricToggle metric={metric} onChange={setMetric} /> : undefined}
    >
      {empty ? (
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      ) : (
        <HeatmapWrapper data={data} />
      )}
    </CollapsibleCard>
  );
}

function TopicMetricToggle({
  metric,
  onChange,
}: {
  metric: TopicMetric;
  onChange: (next: TopicMetric) => void;
}) {
  const copy = REPORTS_COPY.overview.topicCoverage;
  const options: Array<{ value: TopicMetric; label: string }> = [
    { value: "answers", label: copy.metricLabels.answers },
    { value: "citations", label: copy.metricLabels.citations },
  ];
  return (
    <div
      className="inline-flex shrink-0 rounded-md border border-neutral-300 bg-white p-0.5"
      role="group"
      aria-label={copy.metricLabels.aria}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={metric === opt.value}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition",
            metric === opt.value
              ? "bg-primary-100 text-primary-700"
              : "text-neutral-600 hover:bg-neutral-100",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
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
    <CollapsibleCard icon={MessageSquare} title={copy.title} tooltip={copy.tooltip}>
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
    </CollapsibleCard>
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
