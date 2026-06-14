import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Eye,
  Globe,
  Grid3X3,
  Heart,
  Layers,
  Loader2,
  MessageSquare,
  Minus,
  PieChart,
  Quote,
  Smile,
  Swords,
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
import { EntityTrendDrillDown } from "@/components/molecules/EntityTrendDrillDown";
import type { DateGranularity } from "@/components/molecules/DateGranularityToggle";
import { DateRangeGranularityPicker } from "@/components/molecules/DateRangeGranularityPicker";
import { FiltersPopover, FiltersPopoverRow } from "@/components/molecules/FiltersPopover";
import { LensChipRow } from "@/components/molecules/LensChipRow";
import {
  MetricCategoryLayout,
  type MetricCategorySection,
} from "@/components/molecules/MetricCategoryLayout";
import { InfoTooltip } from "@/components/molecules/InfoTooltip";
import { TrustSignalsPill } from "@/components/molecules/TrustSignalsPill";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { sentimentColors } from "@/components/charts/chartTheme";
import { DonutChartWrapper, type DonutChartDatum } from "@/components/charts/DonutChartWrapper";
import { HeatmapWrapper, type HeatmapData } from "@/components/charts/HeatmapWrapper";
import { LineChartWrapper, type LineChartSeries } from "@/components/charts/LineChartWrapper";
import { RadarChartWrapper, type RadarChartDatum } from "@/components/charts/RadarChartWrapper";
import {
  defaultDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { MarketSelector } from "@/components/molecules/MarketSelector";
import { ProductSelector } from "@/components/molecules/ProductSelector";
import { TopicSelector } from "@/components/molecules/TopicSelector";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { EntityScopeToggle, type EntityScope } from "@/components/molecules/EntityScopeToggle";
import { REPORTS_COPY } from "@/content/reports";
import { useDiscoverySummary } from "@/features/reports/hooks/useDiscoverySummary";
import { useAudienceCounts } from "@/features/reports/hooks/useAudienceCounts";
import { useLensCounts } from "@/features/reports/hooks/useLensCounts";
import { useMarketCounts } from "@/features/reports/hooks/useMarketCounts";
import { useProductCounts } from "@/features/reports/hooks/useProductCounts";
import { useTopicCounts } from "@/features/reports/hooks/useTopicCounts";
import { useWorkspaceCompetitive } from "@/features/reports/hooks/useWorkspaceCompetitive";
import { useWorkspaceDepth } from "@/features/reports/hooks/useWorkspaceDepth";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { useUpdateFactualClaimReviewStatus } from "@/features/reports/hooks/useUpdateFactualClaimReviewStatus";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import { findEntityTrend } from "@/lib/entityTrend";
import { bucketTrendPoints } from "@/lib/trendBucketing";
import { cn } from "@/lib/utils";
import type {
  BrandCompetitiveGapGroupDto,
  BrandedDimensionGroupDto,
  CompetitiveGapDto,
  DomainRowDto,
  DomainTypeShareDto,
  EntityMentionDto,
  EntityRateDto,
  EntityTrendSeriesDto,
  TopicHeatmapDto,
  PlatformMentionDto,
  SentimentSliceDto,
  WorkspaceBrandAttributeDto,
  WorkspaceBrandComparisonDto,
  WorkspaceBrandRiskFlagDto,
  WorkspaceCoMentionDto,
  WorkspaceFactualClaimDto,
  WorkspaceHeroDto,
  WorkspaceTopicOwnershipDto,
  WorkspaceOverviewDto,
  WorkspaceRecentChatDto,
  WorkspaceTopEntityRowDto,
} from "@/types/api";

// Module-level empty array so the `topicsByBrand ?? EMPTY_GROUPS`
// fallbacks below don't allocate a new `[]` per render — keeps the
// dropdown selectors' memoization stable when the query hasn't
// resolved yet.
const EMPTY_GROUPS: readonly BrandedDimensionGroupDto[] = [];

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
  // Entity scope drives which entities flow through the per-series cards
  // (TrendCard, Top entities, ShareOfVoice, Brand-vs-competitor, etc.).
  // Replaces the old per-entity BrandSelector — the sidebar's tracker
  // scope already owns the brand-level filter, so this control just
  // picks the slice (all / tracked-only / top 5 by mention count).
  const [entityScope, setEntityScope] = useState<EntityScope>("all");
  // Lifted from the old DepthSections wrapper so the chats card +
  // drawer can live in different parts of the category layout.
  const [selectedChat, setSelectedChat] = useState<WorkspaceRecentChatDto | null>(null);
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
  // flipping D/W/M is instant and doesn't refetch. Default = Week: the
  // 30-day default window typically holds ~4 scans, and weekly buckets
  // read cleaner than per-scan points at that range.
  const [granularity, setGranularity] = useState<DateGranularity>("week");
  // Per-metric refs let hero tiles scroll to the matching trend card.
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Tracker-scope filter from the sidebar's TrackerSelector. `"all"` →
  // no filter (matches the LensCodes/TopicNames convention on the BE);
  // explicit subset → only those trackers feed the analytics queries.
  const { scope: trackerScope } = useTrackerScope();
  const trackerIds = trackerScope === "all" ? [] : trackerScope;
  const { data, isLoading, isFetching, isError, error, refetch } = useWorkspaceOverview(
    range,
    selectedLensCodes,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
    trackerIds,
  );
  // Slice B + C data fetched separately so a failure in one doesn't
  // blank the whole page. Lifted out of the old wrapper components so
  // each card can live in its own metric category.
  const { data: competitiveData } = useWorkspaceCompetitive(
    range,
    selectedLensCodes,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
    trackerIds,
  );
  const { data: depthData } = useWorkspaceDepth(
    range,
    selectedLensCodes,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
    trackerIds,
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
  // Discovery summary — per-brand groupings for products, markets,
  // audiences, topics, trust signals. Each tracker dropdown renders one
  // section per brand using these groups so the user can see which
  // dimensions belong to which brand.
  const { data: discoverySummary } = useDiscoverySummary();
  const topicsByBrand = discoverySummary?.topics ?? EMPTY_GROUPS;
  const productsByBrand = discoverySummary?.products ?? EMPTY_GROUPS;
  const marketsByBrand = discoverySummary?.markets ?? EMPTY_GROUPS;
  const audiencesByBrand = discoverySummary?.audiences ?? EMPTY_GROUPS;
  const trustSignalsByBrand = discoverySummary?.trustSignals ?? EMPTY_GROUPS;
  const copy = REPORTS_COPY.overview;

  /** Hero-tile drill-down. Scrolls to the trend card for the chosen metric. */
  function handleHeroDrillDown(metric: string) {
    const el = chartRefs.current[metric];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Derive selectedKeys from the entity scope + workspace data. Empty
  // when data hasn't landed yet; downstream filtering is no-op on []. The
  // "top5" branch ranks by mentionCount from the competitive payload and
  // falls back to "all" until that payload arrives so the page doesn't
  // briefly render with zero series.
  const selectedKeys = useMemo<string[]>(() => {
    if (!data) return [];
    const trackedKeys = data.trackedBrands.map((b) => `Brand:${b.brandId}`);
    const competitorKeys = data.competitors.map((c) => `Competitor:${c.competitorId}`);
    switch (entityScope) {
      case "all":
        return [...trackedKeys, ...competitorKeys];
      case "tracked":
        return trackedKeys;
      case "top5":
        if (!competitiveData) return [...trackedKeys, ...competitorKeys];
        return [...competitiveData.mentionDistribution]
          .sort((a, b) => b.mentionCount - a.mentionCount)
          .slice(0, 5)
          .map((m) => `${m.entityType}:${m.entityId}`);
    }
  }, [data, competitiveData, entityScope]);

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

  const controlsStrip = (
    <ComparisonControlsRow
      entityScope={entityScope}
      onEntityScopeChange={setEntityScope}
      selectedLensCodes={selectedLensCodes}
      onSelectedLensCodesChange={setSelectedLensCodes}
      lensCountsByCode={lensCountsByCode}
      topicsByBrand={topicsByBrand}
      selectedTopicNames={selectedTopicNames}
      onSelectedTopicNamesChange={setSelectedTopicNames}
      topicCountsByName={topicCountsByName}
      productsByBrand={productsByBrand}
      selectedProductNames={selectedProductNames}
      onSelectedProductNamesChange={setSelectedProductNames}
      productCountsByName={productCountsByName}
      marketsByBrand={marketsByBrand}
      selectedMarketNames={selectedMarketNames}
      onSelectedMarketNamesChange={setSelectedMarketNames}
      marketCountsByName={marketCountsByName}
      audiencesByBrand={audiencesByBrand}
      selectedAudienceNames={selectedAudienceNames}
      onSelectedAudienceNamesChange={setSelectedAudienceNames}
      audienceCountsByName={audienceCountsByName}
      trustSignalsByBrand={trustSignalsByBrand}
      isRefreshing={isFetching && !isLoading}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title}>
        <DateRangeGranularityPicker
          range={range}
          onRangeChange={setRange}
          granularity={granularity}
          onGranularityChange={setGranularity}
        />
      </PageHeader>

      {data.trackedBrands.length === 0 ? (
        <>
          {controlsStrip}
          <Card>
            <CardContent className="p-8 text-center text-sm text-neutral-600">
              {copy.empty.noBrands}
            </CardContent>
          </Card>
        </>
      ) : (
        // Soft dim while a refetch is in flight. `placeholderData` keeps the
        // prior payload mounted so nothing actually swaps in — the dim is the
        // only visual signal that fresh data is on the way (plus the spinner
        // in the control bar above).
        <div
          aria-busy={isFetching && !isLoading}
          className={cn(
            "transition-opacity duration-150",
            isFetching && !isLoading && "opacity-60",
          )}
        >
          <CategorizedOverview
            data={data}
            competitiveData={competitiveData}
            depthData={depthData}
            selectedKeys={selectedKeys}
            granularity={granularity}
            chartRefs={chartRefs}
            controlsStrip={controlsStrip}
            onDrillDown={handleHeroDrillDown}
            onSelectChat={setSelectedChat}
          />
          <RecentChatDrawer chat={selectedChat} onClose={() => setSelectedChat(null)} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Categorized layout — 5 sections that match the Scans page grouping. The
// MetricCategoryLayout stacks the controls strip + pill nav together so they
// stay pinned to the top of the viewport as one block while the user scrolls.
// ---------------------------------------------------------------------------

interface CategorizedOverviewProps {
  data: WorkspaceOverviewDto;
  competitiveData: import("@/types/api").WorkspaceCompetitiveDto | undefined;
  depthData: import("@/types/api").WorkspaceDepthDto | undefined;
  selectedKeys: readonly string[];
  granularity: DateGranularity;
  chartRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  /** Filter row forwarded to MetricCategoryLayout's sticky stack. */
  controlsStrip: ReactNode;
  onDrillDown: (metricValue: string) => void;
  onSelectChat: (chat: WorkspaceRecentChatDto) => void;
}

function CategorizedOverview({
  data,
  competitiveData,
  depthData,
  selectedKeys,
  granularity,
  chartRefs,
  controlsStrip,
  onDrillDown,
  onSelectChat,
}: CategorizedOverviewProps) {
  function trendCard(metricValue: string) {
    const metric = METRIC_OPTIONS.find((m) => m.value === metricValue);
    if (!metric) return null;
    return (
      <div
        ref={(el) => {
          chartRefs.current[metric.value] = el;
        }}
        className="scroll-mt-20"
        data-testid={`trend-card-${metric.value}`}
      >
        <TrendCard
          data={data}
          metric={metric}
          selectedKeys={selectedKeys}
          granularity={granularity}
        />
      </div>
    );
  }

  const sections: MetricCategorySection[] = [
    {
      id: "visibility",
      label: "Visibility",
      icon: Eye,
      children: (
        <div className="space-y-4">
          {trendCard("mention")}
          {trendCard("sov")}
          {depthData && <MentionsByPlatformCard rows={depthData.mentionsByPlatform} />}
          <TopEntitiesCard
            rows={data.topEntities}
            series={data.series}
            selectedKeys={selectedKeys}
          />
          <TopicOwnershipCard rows={data.topicOwnership} />
        </div>
      ),
    },
    {
      id: "recommendation",
      label: "Recommendation",
      icon: ThumbsUp,
      children: (
        <div className="space-y-4">
          {trendCard("rec")}
          {trendCard("rank")}
          {competitiveData && (
            <RecommendationRateCard
              rates={competitiveData.recommendationRates}
              selectedKeys={selectedKeys}
            />
          )}
        </div>
      ),
    },
    {
      id: "sentiment",
      label: "Sentiment & Trust",
      icon: Heart,
      children: (
        <div className="space-y-4">
          {trendCard("sentiment")}
          {depthData && <SentimentDistributionCard slices={depthData.sentimentDistribution} />}
          <BrandAttributesCard attributes={data.topBrandAttributes} />
          <BrandRiskFlagsCard flags={data.topBrandRiskFlags} />
          <FactualClaimsCard claims={data.recentFactualClaims} />
          {depthData && <RecentChatsCard chats={depthData.recentChats} onSelect={onSelectChat} />}
        </div>
      ),
    },
    {
      id: "competitive",
      label: "Competitive",
      icon: Swords,
      children: (
        <div className="space-y-4">
          {competitiveData && (
            <ShareOfVoiceCard
              mentions={competitiveData.mentionDistribution}
              selectedKeys={selectedKeys}
            />
          )}
          {competitiveData && (
            <BrandVsCompetitorCard
              mentions={competitiveData.mentionDistribution}
              selectedKeys={selectedKeys}
            />
          )}
          {competitiveData && (
            <MentionDistributionCard
              mentions={competitiveData.mentionDistribution}
              selectedKeys={selectedKeys}
            />
          )}
          {competitiveData && (
            <CompetitiveGapGroupsCard
              groups={competitiveData.competitiveGaps}
              selectedKeys={selectedKeys}
            />
          )}
          <CoMentionLandscapeCard rows={data.coMentions} selectedKeys={selectedKeys} />
          <HeadToHeadCard rows={data.topBrandComparisons} />
          {depthData && <TopicHeatmapCard heatmap={depthData.topicHeatmap} />}
        </div>
      ),
    },
    {
      id: "citations",
      label: "Citations & Sources",
      icon: Quote,
      children: (
        <div className="space-y-4">
          {trendCard("owned")}
          {competitiveData && <TopCitationDomainsCard rows={competitiveData.topDomains} />}
          {competitiveData && <DomainTypesCard rows={competitiveData.domainTypes} />}
        </div>
      ),
    },
  ];

  return (
    <MetricCategoryLayout
      statusStrip={
        <HeroRow hero={data.hero} previousHero={data.previousHero} onDrillDown={onDrillDown} />
      }
      controlsStrip={controlsStrip}
      sections={sections}
    />
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
// Co-mention landscape (Phase 4 measurement-model item #8). Bars for the
// count of in-scope answers where a tracked brand AND the competitor were
// both mentioned, with a per-row "share of competitor's mentions" caption
// for context. Filtered by the selected competitor keys so toggling a
// competitor off in the BrandSelector hides it here too.
// ---------------------------------------------------------------------------

function CoMentionLandscapeCard({
  rows,
  selectedKeys,
}: {
  rows: readonly WorkspaceCoMentionDto[];
  selectedKeys: readonly string[];
}) {
  const copy = REPORTS_COPY.overview.coMentionLandscape;
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const visibleRows = rows.filter((r) => selectedSet.has(`Competitor:${r.competitorId}`));

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

// ---------------------------------------------------------------------------
// Head-to-head wins/losses by aspect (Phase 4 measurement-model item #15).
// Compact table: aspect | wins | losses | net. The net column is colored
// success-green when positive and error-red when negative so a glance
// shows which dimensions the brand is dominant on vs trailing on.
// ---------------------------------------------------------------------------

function HeadToHeadCard({ rows }: { rows: readonly WorkspaceBrandComparisonDto[] }) {
  const copy = REPORTS_COPY.overview.headToHead;
  if (rows.length === 0) {
    return (
      <CollapsibleCard icon={Swords} title={copy.title} tooltip={copy.tooltip}>
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      </CollapsibleCard>
    );
  }
  return (
    <CollapsibleCard icon={Swords} title={copy.title} tooltip={copy.tooltip}>
      <p className="mb-3 text-xs text-neutral-500">{copy.subline}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Aspect
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {copy.winsHeader}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {copy.lossesHeader}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {copy.netHeader}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => {
              const net = r.winCount - r.lossCount;
              return (
                <tr key={`${r.rank}:${r.aspect}`}>
                  <td className="px-3 py-2 font-medium text-neutral-900">{r.aspect}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-semantic-success-700">
                    {r.winCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-semantic-error-700">
                    {r.lossCount}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right tabular-nums",
                      net > 0
                        ? "text-semantic-success-700"
                        : net < 0
                          ? "text-semantic-error-700"
                          : "text-neutral-500",
                    )}
                  >
                    {net > 0 ? `+${net}` : net}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CollapsibleCard>
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
  entityScope: EntityScope;
  onEntityScopeChange: (next: EntityScope) => void;
  selectedLensCodes: readonly string[];
  onSelectedLensCodesChange: (next: string[]) => void;
  lensCountsByCode?: Readonly<Record<string, number>>;
  /** Workspace's topics, grouped per brand for the dropdown sections. */
  topicsByBrand: readonly BrandedDimensionGroupDto[];
  selectedTopicNames: readonly string[];
  onSelectedTopicNamesChange: (next: string[]) => void;
  topicCountsByName?: Readonly<Record<string, number>>;
  productsByBrand: readonly BrandedDimensionGroupDto[];
  selectedProductNames: readonly string[];
  onSelectedProductNamesChange: (next: string[]) => void;
  productCountsByName?: Readonly<Record<string, number>>;
  marketsByBrand: readonly BrandedDimensionGroupDto[];
  selectedMarketNames: readonly string[];
  onSelectedMarketNamesChange: (next: string[]) => void;
  marketCountsByName?: Readonly<Record<string, number>>;
  audiencesByBrand: readonly BrandedDimensionGroupDto[];
  selectedAudienceNames: readonly string[];
  onSelectedAudienceNamesChange: (next: string[]) => void;
  audienceCountsByName?: Readonly<Record<string, number>>;
  /** Workspace's trust signals grouped per brand — informational only. */
  trustSignalsByBrand: readonly BrandedDimensionGroupDto[];
  /** True while a new date range is fetching (placeholderData kept the
   *  prior payload visible). Drives a tiny spinner inside the bar so the
   *  user knows fresh data is on its way. */
  isRefreshing?: boolean;
}

function ComparisonControlsRow({
  entityScope,
  onEntityScopeChange,
  selectedLensCodes,
  onSelectedLensCodesChange,
  lensCountsByCode,
  topicsByBrand,
  selectedTopicNames,
  onSelectedTopicNamesChange,
  topicCountsByName,
  productsByBrand,
  selectedProductNames,
  onSelectedProductNamesChange,
  productCountsByName,
  marketsByBrand,
  selectedMarketNames,
  onSelectedMarketNamesChange,
  marketCountsByName,
  audiencesByBrand,
  selectedAudienceNames,
  onSelectedAudienceNamesChange,
  audienceCountsByName,
  trustSignalsByBrand,
  isRefreshing = false,
}: ComparisonControlsRowProps) {
  // Coverage filters (Topics/Products/Markets/Audiences) drive the count
  // badge on the Filters chip. Trust signals are informational and don't
  // count. An "active" group is one with any selection — the empty
  // sentinel means "all", which doesn't filter anything.
  const activeFilterCount =
    (selectedTopicNames.length > 0 ? 1 : 0) +
    (selectedProductNames.length > 0 ? 1 : 0) +
    (selectedMarketNames.length > 0 ? 1 : 0) +
    (selectedAudienceNames.length > 0 ? 1 : 0);

  function clearAllFilters() {
    onSelectedTopicNamesChange([]);
    onSelectedProductNamesChange([]);
    onSelectedMarketNamesChange([]);
    onSelectedAudienceNamesChange([]);
  }

  // Single sticky row. Lens chips on the left (compact toggle pills with
  // per-lens counts — doubles as a mini distribution view). On the right:
  // brand selector + coverage Filters popover that wraps the 4 multi-
  // selects + the informational trust-signals pill. Date + granularity
  // live in the PageHeader so they're not duplicated here.
  //
  // Sticky behavior is owned by the outer MetricCategoryLayout.
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <LensChipRow
        selectedCodes={selectedLensCodes}
        onChange={onSelectedLensCodesChange}
        countsByCode={lensCountsByCode}
      />
      {isRefreshing && (
        <span
          aria-live="polite"
          aria-label="Refreshing"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs text-neutral-500"
        >
          <Loader2 size={14} className="animate-spin text-primary-500" aria-hidden />
          Refreshing…
        </span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <EntityScopeToggle value={entityScope} onChange={onEntityScopeChange} />
        <FiltersPopover activeCount={activeFilterCount} onClearAll={clearAllFilters}>
          <FiltersPopoverRow label="Topics" active={selectedTopicNames.length > 0}>
            <TopicSelector
              topicsByBrand={topicsByBrand}
              selectedNames={selectedTopicNames}
              onChange={onSelectedTopicNamesChange}
              countsByName={topicCountsByName}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Products & Services" active={selectedProductNames.length > 0}>
            <ProductSelector
              productsByBrand={productsByBrand}
              selectedNames={selectedProductNames}
              onChange={onSelectedProductNamesChange}
              countsByName={productCountsByName}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Markets" active={selectedMarketNames.length > 0}>
            <MarketSelector
              marketsByBrand={marketsByBrand}
              selectedNames={selectedMarketNames}
              onChange={onSelectedMarketNamesChange}
              countsByName={marketCountsByName}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Audiences" active={selectedAudienceNames.length > 0}>
            <AudienceSelector
              audiencesByBrand={audiencesByBrand}
              selectedNames={selectedAudienceNames}
              onChange={onSelectedAudienceNamesChange}
              countsByName={audienceCountsByName}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Trust signals" variant="reference">
            <TrustSignalsPill trustSignalsByBrand={trustSignalsByBrand} />
          </FiltersPopoverRow>
        </FiltersPopover>
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
      <HeroTile
        label="Absence rate"
        value={hero.brandAbsenceRate == null ? "—" : `${Math.round(hero.brandAbsenceRate * 100)}%`}
        current={hero.brandAbsenceRate}
        previous={previousHero?.brandAbsenceRate ?? null}
        invertDelta
      />
      <HeroTile
        label="First-mention rate"
        value={
          hero.brandFirstMentionRate == null
            ? "—"
            : `${Math.round(hero.brandFirstMentionRate * 100)}%`
        }
        current={hero.brandFirstMentionRate}
        previous={previousHero?.brandFirstMentionRate ?? null}
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
  invertDelta = false,
}: {
  label: string;
  value: string;
  /** Raw numeric current value used to derive the delta chip. */
  current: number | null;
  /** Equivalent previous-window value. Null = no delta to show. */
  previous: number | null;
  onClick?: () => void;
  /** When true, treat "up" as bad (red) and "down" as good (green). Used for absence rate. */
  invertDelta?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-neutral-500">
        <span className="truncate">{label}</span>
        <InfoTooltip label={label} iconSize={12} />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-neutral-900">{value}</p>
        <HeroDelta current={current} previous={previous} invertColors={invertDelta} />
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
function HeroDelta({
  current,
  previous,
  invertColors = false,
}: {
  current: number | null;
  previous: number | null;
  /** When true, "up" reads red (absence rate, etc); "down" reads green. */
  invertColors?: boolean;
}) {
  if (current == null || previous == null) return null;
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-medium",
          invertColors ? "text-semantic-error-600" : "text-semantic-success-600",
        )}
      >
        <ArrowUp size={12} aria-hidden /> New
      </span>
    );
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return null;
  const isUp = rounded > 0;
  const isGood = invertColors ? !isUp : isUp;
  return (
    <span
      aria-label={`${isUp ? "Up" : "Down"} ${Math.abs(rounded)} percent vs previous period`}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isGood ? "text-semantic-success-600" : "text-semantic-error-600",
      )}
    >
      {isUp ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />}
      {Math.abs(rounded)}%
    </span>
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
  series,
  selectedKeys,
}: {
  rows: readonly WorkspaceTopEntityRowDto[];
  series: readonly EntityTrendSeriesDto[];
  selectedKeys: readonly string[];
}) {
  const copy = REPORTS_COPY.overview.topEntities;
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const visibleRows = rows.filter((r) => selectedSet.has(`${r.entityType}:${r.entityId}`));
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <CollapsibleCard icon={Trophy} title={copy.title} tooltip={copy.tooltip}>
      {visibleRows.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="w-6 px-2 py-2 font-medium"></th>
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
              {visibleRows.map((row) => {
                const key = `${row.entityType}:${row.entityId}`;
                const isExpanded = expandedKey === key;
                const trend = findEntityTrend(series, row.entityType, row.entityId);
                return (
                  <Fragment key={key}>
                    <tr
                      className={cn(
                        "cursor-pointer transition hover:bg-neutral-50",
                        isExpanded && "bg-neutral-50",
                      )}
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                      aria-expanded={isExpanded}
                      aria-controls={`overview-drill-${key}`}
                    >
                      <td className="w-6 px-2 py-2 text-neutral-400">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </td>
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
                    {isExpanded && (
                      <tr id={`overview-drill-${key}`}>
                        <td colSpan={5} className="bg-neutral-50 p-4">
                          <EntityTrendDrillDown name={row.name} trend={trend} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleCard>
  );
}

// ---------------------------------------------------------------------------
// Topic ownership (Phase 4 measurement-model item #18). Table view:
// topic | prompts | brand-mentioned | ownership rate. Rate is colored
// success-green when ≥66% (we own it), error-red when ≤33% (we lose it),
// neutral otherwise so a glance shows which conversations we dominate vs
// which we're absent from.
// ---------------------------------------------------------------------------

function TopicOwnershipCard({ rows }: { rows: readonly WorkspaceTopicOwnershipDto[] }) {
  const copy = REPORTS_COPY.overview.topicOwnership;
  if (rows.length === 0) {
    return (
      <CollapsibleCard icon={MessageSquare} title={copy.title} tooltip={copy.tooltip}>
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      </CollapsibleCard>
    );
  }
  return (
    <CollapsibleCard icon={MessageSquare} title={copy.title} tooltip={copy.tooltip}>
      <p className="mb-3 text-xs text-neutral-500">{copy.subline}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {copy.topicHeader}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {copy.promptsHeader}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {copy.mentionedHeader}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {copy.shareHeader}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => {
              const share = r.promptCount === 0 ? 0 : r.brandMentionedPromptCount / r.promptCount;
              const pct = Math.round(share * 100);
              const colorClass =
                share >= 2 / 3
                  ? "text-semantic-success-700"
                  : share <= 1 / 3
                    ? "text-semantic-error-700"
                    : "text-neutral-700";
              return (
                <tr key={`${r.rank}:${r.topicName}`}>
                  <td className="px-3 py-2 font-medium text-neutral-900">{r.topicName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.promptCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.brandMentionedPromptCount}
                  </td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-medium", colorClass)}>
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

/**
 * Top brand attributes aggregated across every tracker's scans in window.
 * Mirrors the per-scan ScanResultsScreen "Brand attributes" card so the
 * chip pattern + polarity coloring are consistent across scopes.
 * Attribute polarity is independent of mention sentiment — a positive
 * mention can carry a negative attribute, which is the load-bearing
 * reason this is tracked separately from the sentiment distribution.
 */
function BrandAttributesCard({
  attributes,
}: {
  attributes: readonly WorkspaceBrandAttributeDto[];
}) {
  const copy = REPORTS_COPY.overview.brandAttributes;
  return (
    <CollapsibleCard icon={ThumbsUp} title={copy.title} tooltip={copy.tooltip}>
      {attributes.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      ) : (
        <ul className="flex flex-wrap gap-2" role="list">
          {attributes.map((a) => (
            <li key={`${a.rank}:${a.name}`}>
              <Badge variant={attributePolarityVariant(a.polarity)} className="gap-1 text-xs">
                <span>{a.name}</span>
                <span className="opacity-70">×{a.mentionCount}</span>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleCard>
  );
}

/**
 * Risk-flag rollup card — the AI-surfaced concerns about a tracked
 * brand (item #11). Independent of sentiment: a positive answer can
 * still flag a recent layoff. Severity colors mirror the standard
 * severity scale (Low=secondary, Medium=warning, High=destructive)
 * so a glance at the chips reads urgency without reading labels.
 */
function BrandRiskFlagsCard({ flags }: { flags: readonly WorkspaceBrandRiskFlagDto[] }) {
  const copy = REPORTS_COPY.overview.brandRiskFlags;
  return (
    <CollapsibleCard icon={AlertTriangle} title={copy.title} tooltip={copy.tooltip}>
      {flags.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-neutral-500">{copy.subline}</p>
          <ul className="flex flex-wrap gap-2" role="list">
            {flags.map((f) => (
              <li key={`${f.rank}:${f.flagType}`}>
                <Badge variant={riskSeverityVariant(f.severity)} className="gap-1 text-xs">
                  <span>{f.flagType}</span>
                  <span className="opacity-70">×{f.mentionCount}</span>
                </Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </CollapsibleCard>
  );
}

function riskSeverityVariant(
  severity: string,
): "default" | "secondary" | "outline" | "success" | "warning" | "destructive" {
  switch (severity) {
    case "High":
      return "destructive";
    case "Medium":
      return "warning";
    case "Low":
    default:
      return "secondary";
  }
}

/**
 * Factual-claims feed (item #14). Each claim is a checkable assertion
 * the AI made about a tracked brand — subject + asserted value plus
 * the supporting snippet. Each row carries a 3-button verdict toggle
 * (Pending / Verified / Disputed); clicking fires the only allowed
 * write on the otherwise append-only FactualClaim table. Workspace
 * ownership is enforced server-side; the FE just fires the new value.
 */
function FactualClaimsCard({ claims }: { claims: readonly WorkspaceFactualClaimDto[] }) {
  const copy = REPORTS_COPY.overview.factualClaims;
  const update = useUpdateFactualClaimReviewStatus();

  if (claims.length === 0) {
    return (
      <CollapsibleCard icon={Quote} title={copy.title} tooltip={copy.tooltip}>
        <p className="text-sm text-neutral-500">{copy.noData}</p>
      </CollapsibleCard>
    );
  }
  return (
    <CollapsibleCard icon={Quote} title={copy.title} tooltip={copy.tooltip}>
      <p className="mb-3 text-xs text-neutral-500">{copy.subline}</p>
      <ul className="space-y-2" role="list">
        {claims.map((c) => {
          const failedHere = update.isError && update.variables?.claimId === c.claimId;
          return (
            <li
              key={c.claimId}
              className="rounded-lg border border-neutral-200 bg-white p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                <span className="font-medium text-neutral-700">{c.brandName}</span>
                <VerdictToggle
                  claimId={c.claimId}
                  current={c.reviewStatus}
                  copy={copy}
                  onChange={(next) => update.mutate({ claimId: c.claimId, reviewStatus: next })}
                  disabled={update.isPending}
                />
              </div>
              <p className="mt-1 text-sm text-neutral-900">{c.claimText}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">
                {c.subject.replace(/_/g, " ")}
                <span className="ml-2 normal-case text-neutral-700">{c.assertedValue}</span>
              </p>
              {failedHere && (
                <p className="mt-2 text-xs text-semantic-error-600" role="alert">
                  {update.error instanceof Error ? update.error.message : copy.verdictError}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </CollapsibleCard>
  );
}

/**
 * 3-button verdict toggle for a single factual claim. The active
 * status is styled as a colored chip; the other two read as muted
 * buttons. Clicking the currently-active one is a no-op (the BE
 * short-circuits same-value writes) but the user can revise back to
 * Pending if they want to re-queue.
 */
function VerdictToggle({
  claimId,
  current,
  copy,
  onChange,
  disabled,
}: {
  claimId: string;
  current: string;
  copy: {
    statusPending: string;
    statusVerified: string;
    statusDisputed: string;
    verdictGroupLabel: string;
  };
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  const options: Array<{ value: string; label: string }> = [
    { value: "Pending", label: copy.statusPending },
    { value: "Verified", label: copy.statusVerified },
    { value: "Disputed", label: copy.statusDisputed },
  ];
  return (
    <div
      role="group"
      aria-label={`${copy.verdictGroupLabel} for ${claimId}`}
      className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5"
    >
      {options.map((opt) => {
        const isActive = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium transition",
              isActive ? verdictActiveClass(opt.value) : "text-neutral-500 hover:bg-neutral-100",
              disabled && "opacity-60",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function verdictActiveClass(status: string): string {
  switch (status) {
    case "Verified":
      return "bg-semantic-success-100 text-semantic-success-700";
    case "Disputed":
      return "bg-semantic-error-100 text-semantic-error-700";
    case "Pending":
    default:
      return "bg-semantic-warning-100 text-semantic-warning-700";
  }
}

function attributePolarityVariant(
  polarity: string,
): "default" | "secondary" | "outline" | "success" | "warning" | "destructive" {
  switch (polarity) {
    case "Positive":
      return "success";
    case "Negative":
      return "destructive";
    case "Neutral":
    default:
      return "secondary";
  }
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
