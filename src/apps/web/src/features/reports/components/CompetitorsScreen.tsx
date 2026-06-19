import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Crown,
  Hash,
  Percent,
  TrendingUp,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { LineChartWrapper, type LineChartSeries } from "@/components/charts/LineChartWrapper";
import { CollapsibleCard } from "@/components/molecules/CollapsibleCard";
import {
  DateRangePicker,
  defaultDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { AudienceSelector } from "@/components/molecules/AudienceSelector";
import { FiltersPopover, FiltersPopoverRow } from "@/components/molecules/FiltersPopover";
import { InfoTooltip } from "@/components/molecules/InfoTooltip";
import { LensChipRow } from "@/components/molecules/LensChipRow";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { MarketSelector } from "@/components/molecules/MarketSelector";
import {
  MetricCategoryLayout,
  type MetricCategorySection,
} from "@/components/molecules/MetricCategoryLayout";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ProductSelector } from "@/components/molecules/ProductSelector";
import { TopicSelector } from "@/components/molecules/TopicSelector";
import { VISIBILITY_LENSES } from "@/content/lenses";
import { REPORTS_COPY } from "@/content/reports";
import { BrandVsCompetitorCard } from "@/features/reports/components/BrandVsCompetitorCard";
import { CoMentionLandscapeCard } from "@/features/reports/components/CoMentionLandscapeCard";
import { CompetitiveGapGroupsCard } from "@/features/reports/components/CompetitiveGapGroupsCard";
import {
  countCompetitorsByRecommendation,
  countCompetitorsByRelationship,
  deriveCompetitorLeadRows,
  filterCompetitorRows,
  type CompetitorLeadRow,
  type CompetitorRecommendationFilter,
  type CompetitorRelationshipFilter,
} from "@/features/reports/competitors";
import {
  InlineChipFilter,
  PLATFORM_LABELS,
  platformLabel,
  SENTIMENT_ORDER,
} from "@/features/reports/components/FilterChips";
import { RecommendationRateCard } from "@/features/reports/components/RecommendationRateCard";
import { ShareOfVoiceCard } from "@/features/reports/components/ShareOfVoiceCard";
import { useAudienceCounts } from "@/features/reports/hooks/useAudienceCounts";
import { useDiscoverySummary } from "@/features/reports/hooks/useDiscoverySummary";
import { useMarketCounts } from "@/features/reports/hooks/useMarketCounts";
import { useProductCounts } from "@/features/reports/hooks/useProductCounts";
import { useTopicCounts } from "@/features/reports/hooks/useTopicCounts";
import { useWorkspaceCompetitive } from "@/features/reports/hooks/useWorkspaceCompetitive";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { previousSelectionFor } from "@/lib/previousWindow";
import { cn } from "@/lib/utils";
import type {
  BrandedDimensionGroupDto,
  EntityMentionDto,
  EntityRateDto,
  EntityTrendSeriesDto,
} from "@/types/api";

const ALL_LENS_CODES = VISIBILITY_LENSES.map((l) => l.code);
const EMPTY_GROUPS: readonly BrandedDimensionGroupDto[] = [];
// Color palette shared with /overview's Top Entities trend so the same
// entity reads as the same color when the user switches between pages.
const ENTITY_PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#a855f7"];

/**
 * Workspace-wide competitor ranks at /competitors. Brought into the
 * canonical page shell (title-only PageHeader → MetricCategoryLayout
 * with Hero KPI tiles + SoV trend card on top, sticky single-row
 * controls strip, and a single Competitive Ranking section).
 *
 * Filters: lens chips (filter only — single section), date range,
 * Topics / Products / Markets / Audiences / Models / Sentiment. All
 * filter args are passed through to both `useWorkspaceCompetitive`
 * (drives the ranking) and `useWorkspaceOverview` (drives the SoV
 * trend lines).
 */
export function CompetitorsScreen() {
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [selectedLenses, setSelectedLenses] = useState<readonly string[]>(ALL_LENS_CODES);
  const [selectedTopicNames, setSelectedTopicNames] = useState<string[]>([]);
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const [selectedMarketNames, setSelectedMarketNames] = useState<string[]>([]);
  const [selectedAudienceNames, setSelectedAudienceNames] = useState<string[]>([]);
  const [selectedPlatformCodes, setSelectedPlatformCodes] = useState<string[]>([]);
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>([]);

  // Pass NO_LENS_FILTER through to the BE when every lens is selected
  // (cross-lens view); narrow when the user picks a subset. Matches the
  // sentinel pattern used on /overview + /prompts.
  const lensCodesForApi = selectedLenses.length === ALL_LENS_CODES.length ? [] : selectedLenses;

  const competitive = useWorkspaceCompetitive(
    range,
    lensCodesForApi,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
    trackerIds,
    selectedSentiments,
    selectedPlatformCodes,
  );
  // Second competitive fetch shifted back one window for the Movers
  // card. When the user picks "All time" the previous selection equals
  // the current one — React-Query dedupes via the cache key so this
  // costs nothing in that case.
  const previousSelection = useMemo(() => previousSelectionFor(range), [range]);
  const previousCompetitive = useWorkspaceCompetitive(
    previousSelection,
    lensCodesForApi,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
    trackerIds,
    selectedSentiments,
    selectedPlatformCodes,
  );
  const overview = useWorkspaceOverview(
    range,
    lensCodesForApi,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
    trackerIds,
    selectedSentiments,
    selectedPlatformCodes,
  );

  const { data: discoverySummary } = useDiscoverySummary();
  const topicsByBrand = discoverySummary?.topics ?? EMPTY_GROUPS;
  const productsByBrand = discoverySummary?.products ?? EMPTY_GROUPS;
  const marketsByBrand = discoverySummary?.markets ?? EMPTY_GROUPS;
  const audiencesByBrand = discoverySummary?.audiences ?? EMPTY_GROUPS;
  const { data: topicCountsRaw } = useTopicCounts(range);
  const { data: productCountsRaw } = useProductCounts(range);
  const { data: marketCountsRaw } = useMarketCounts(range);
  const { data: audienceCountsRaw } = useAudienceCounts(range);
  const topicCountsByName = useMemo<Record<string, number>>(() => {
    if (!topicCountsRaw) return {};
    return Object.fromEntries(topicCountsRaw.map((t) => [t.topicName, t.mentionCount]));
  }, [topicCountsRaw]);
  const productCountsByName = useMemo<Record<string, number>>(() => {
    if (!productCountsRaw) return {};
    return Object.fromEntries(productCountsRaw.map((p) => [p.productName, p.mentionCount]));
  }, [productCountsRaw]);
  const marketCountsByName = useMemo<Record<string, number>>(() => {
    if (!marketCountsRaw) return {};
    return Object.fromEntries(marketCountsRaw.map((m) => [m.marketName, m.mentionCount]));
  }, [marketCountsRaw]);
  const audienceCountsByName = useMemo<Record<string, number>>(() => {
    if (!audienceCountsRaw) return {};
    return Object.fromEntries(audienceCountsRaw.map((a) => [a.audienceName, a.mentionCount]));
  }, [audienceCountsRaw]);

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
  const competitorLeads = deriveCompetitorLeadRows(competitive.data.competitiveGaps);
  const previousRows = previousCompetitive.data
    ? mergeEntityRows(
        previousCompetitive.data.mentionDistribution,
        previousCompetitive.data.recommendationRates,
      )
    : [];
  // Movers is meaningful only when current vs previous represent two
  // distinct windows. For "All time" the two selections are identical
  // and the card renders an explanatory empty state.
  const isMoversComparable = range.kind !== "all";

  const activeFilterCount =
    (selectedTopicNames.length > 0 ? 1 : 0) +
    (selectedProductNames.length > 0 ? 1 : 0) +
    (selectedMarketNames.length > 0 ? 1 : 0) +
    (selectedAudienceNames.length > 0 ? 1 : 0) +
    (selectedPlatformCodes.length > 0 ? 1 : 0) +
    (selectedSentiments.length > 0 ? 1 : 0);

  const controlsStrip = (
    <div className="flex flex-nowrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <div className="min-w-0 flex-1 overflow-x-auto">
        <LensChipRow
          selectedCodes={selectedLenses}
          onChange={setSelectedLenses}
          // No section anchor here — the ranking table is cross-lens, so
          // the lens chips on /competitors act as filters only.
        />
      </div>
      <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
        <DateRangePicker value={range} onChange={setRange} />
        <FiltersPopover
          activeCount={activeFilterCount}
          onClearAll={() => {
            setSelectedTopicNames([]);
            setSelectedProductNames([]);
            setSelectedMarketNames([]);
            setSelectedAudienceNames([]);
            setSelectedPlatformCodes([]);
            setSelectedSentiments([]);
          }}
        >
          <div
            role="group"
            aria-label="Discovery filters"
            className="flex flex-wrap items-center gap-1.5 px-2 py-1"
          >
            <TopicSelector
              topicsByBrand={topicsByBrand}
              selectedNames={selectedTopicNames}
              onChange={setSelectedTopicNames}
              countsByName={topicCountsByName}
            />
            <ProductSelector
              productsByBrand={productsByBrand}
              selectedNames={selectedProductNames}
              onChange={setSelectedProductNames}
              countsByName={productCountsByName}
            />
            <MarketSelector
              marketsByBrand={marketsByBrand}
              selectedNames={selectedMarketNames}
              onChange={setSelectedMarketNames}
              countsByName={marketCountsByName}
            />
            <AudienceSelector
              audiencesByBrand={audiencesByBrand}
              selectedNames={selectedAudienceNames}
              onChange={setSelectedAudienceNames}
              countsByName={audienceCountsByName}
            />
          </div>
          <FiltersPopoverRow label="Models" active={selectedPlatformCodes.length > 0}>
            <InlineChipFilter
              available={Object.keys(PLATFORM_LABELS)}
              selected={selectedPlatformCodes}
              onChange={setSelectedPlatformCodes}
              labelFor={platformLabel}
              emptyLabel="No models in scope."
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Sentiment" active={selectedSentiments.length > 0}>
            <InlineChipFilter
              available={SENTIMENT_ORDER}
              selected={selectedSentiments}
              onChange={setSelectedSentiments}
              emptyLabel="No sentiments in scope."
            />
          </FiltersPopoverRow>
        </FiltersPopover>
      </div>
    </div>
  );

  // Multi-section layout. Lens chips above act as filters only — every
  // section is cross-lens, so the chips have no per-lens anchor role.
  const sections: MetricCategorySection[] = [
    {
      id: "CompetitiveRanking",
      label: "Competitive ranking",
      children:
        rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-3 text-xs text-neutral-500">
            No competitor data matches the current filters.
          </p>
        ) : (
          <CompetitorsTable rows={rows} />
        ),
    },
    {
      id: "MentionCounts",
      label: "Mention counts",
      // Pairs with the SoV donut up top — donut shows relative share,
      // bar shows absolute volume. Useful when a tiny SoV slice still
      // dominates by raw count or vice versa.
      children: <BrandVsCompetitorCard mentions={competitive.data.mentionDistribution} />,
    },
    {
      id: "RecommendationRate",
      label: "Recommendation rate",
      children: <RecommendationRateCard rates={competitive.data.recommendationRates} />,
    },
    {
      id: "CompetitiveGaps",
      label: "Competitive gaps",
      children: (
        <div className="space-y-3">
          <CompetitorLeadsSection items={competitorLeads} range={range} />
          <CompetitiveGapGroupsCard groups={competitive.data.competitiveGaps} />
        </div>
      ),
    },
    {
      id: "CoMentionLandscape",
      label: "Co-mention landscape",
      // Surfaces substitute clusters — when a tracked brand IS mentioned,
      // which competitors show up alongside? Strong signal for "who the
      // buyer is comparing us against."
      children: <CoMentionLandscapeCard rows={overview.data?.coMentions ?? []} />,
    },
    {
      id: "Movers",
      label: "Movers",
      // Two-column gainers / losers — flags rising and falling competitors
      // at a glance by diffing the current window against an equal-length
      // back-shifted window. Empty-state when current = "all time" since
      // there's no previous to compare against.
      children: (
        <MoversCard
          currentRows={rows}
          previousRows={previousRows}
          isComparable={isMoversComparable}
          isLoadingPrevious={previousCompetitive.isLoading || previousCompetitive.isFetching}
        />
      ),
    },
  ];

  const hasAnyData = competitive.data.mentionDistribution.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Competitors" />

      {!hasAnyData ? (
        <>
          {controlsStrip}
          <Card>
            <CardContent className="p-8 text-center text-sm text-neutral-600">
              No competitor data in scope yet. Run a scan that includes competitor mentions to
              populate this page.
            </CardContent>
          </Card>
        </>
      ) : (
        <MetricCategoryLayout
          statusStrip={
            <div className="space-y-3">
              <CompetitorHero rows={rows} />
              {/* Competitive trend (metric-switchable time series) + SoV
                  donut (current snapshot) sit side-by-side above the
                  filter bar — paired so "how it's moving" and "where it
                  is right now" read together. Same "context first,
                  filters next, sections below" rhythm as /overview. */}
              <div className="grid gap-3 md:grid-cols-2">
                <CompetitiveTrendCard series={overview.data?.series ?? []} rows={rows} />
                <ShareOfVoiceCard mentions={competitive.data.mentionDistribution} />
              </div>
            </div>
          }
          controlsStrip={controlsStrip}
          sections={sections}
          renderNav={() => null}
        />
      )}
    </div>
  );
}

function CompetitorLeadsSection({
  items,
  range,
}: {
  items: readonly CompetitorLeadRow[];
  range: DateRangeSelection;
}) {
  const copy = REPORTS_COPY.competitors.workspace.leads;
  const [reportQueue, setReportQueue] = useState<Record<string, CompetitorLeadRow>>({});
  const [actionPlans, setActionPlans] = useState<Record<string, true>>({});
  const [notice, setNotice] = useState<string | null>(null);

  function addToReport(item: CompetitorLeadRow) {
    setReportQueue((current) => ({ ...current, [item.id]: item }));
    setNotice(copy.reportNotice.replace("{competitor}", item.competitorName));
  }

  function createActionPlan(item: CompetitorLeadRow) {
    exportCompetitorLeadPlan([item], range);
    setActionPlans((current) => ({ ...current, [item.id]: true }));
    setNotice(copy.planNotice.replace("{competitor}", item.competitorName));
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-neutral-900">{copy.title}</h3>
          <p className="mt-1 text-sm text-neutral-500">{copy.empty}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-labelledby="competitor-leads-title">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="competitor-leads-title" className="text-sm font-semibold text-neutral-900">
                {copy.title}
              </h3>
              <p className="mt-1 text-xs text-neutral-500">{copy.description}</p>
            </div>
            <Badge variant="warning">{items.length.toLocaleString()}</Badge>
          </div>
          {notice && (
            <div className="mt-3 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-800">
              {notice}
            </div>
          )}
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="flex min-h-40 flex-col rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">
                      {item.competitorName}
                    </h4>
                    <p className="mt-1 text-xs text-neutral-500">
                      {copy.beating.replace("{brand}", item.trackedBrandName)}
                    </p>
                  </div>
                  <Badge variant="outline">{item.leadType}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <LeadMetric label={copy.brandValue} value={item.brandValue} />
                  <LeadMetric label={copy.competitorValue} value={item.competitorValue} />
                  <LeadMetric label={copy.gap} value={item.gap} emphasized />
                </div>
                <p className="mt-3 text-xs text-neutral-600">{item.recommendedAction}</p>
                <div className="mt-auto flex justify-end gap-2 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addToReport(item)}
                    disabled={Boolean(reportQueue[item.id])}
                  >
                    {reportQueue[item.id] ? copy.addedToReport : copy.addToReport}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createActionPlan(item)}
                    disabled={Boolean(actionPlans[item.id])}
                  >
                    {actionPlans[item.id] ? copy.planCreated : copy.createPlan}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function LeadMetric({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          emphasized ? "text-semantic-warning-800" : "text-neutral-900",
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero KPI tiles — derived from the merged ranking rows
// ---------------------------------------------------------------------------

function CompetitorHero({ rows }: { rows: readonly CompetitorRow[] }) {
  const summary = useMemo(() => deriveHero(rows), [rows]);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <HeroTile
        icon={Users}
        label="Entities tracked"
        value={summary.totalEntities.toLocaleString()}
        sub={
          summary.totalMentions === 0
            ? "no mentions yet"
            : `${summary.totalMentions.toLocaleString()} mentions`
        }
        tooltip="Distinct brands + competitors with at least one mention in the selected window."
      />
      <HeroTile
        icon={Crown}
        label="Leader"
        value={summary.leader?.name ?? "—"}
        sub={
          summary.leader == null
            ? "no leader"
            : summary.leader.isTrackedBrand
              ? "you"
              : `${summary.leader.mentionCount.toLocaleString()} mentions`
        }
        tooltip="Entity with the most mentions across in-scope answers."
      />
      <HeroTile
        icon={Hash}
        label="Your rank"
        value={summary.yourRank == null ? "—" : `#${summary.yourRank}`}
        sub={summary.yourEntity == null ? "no tracked brand" : summary.yourEntity.name}
        tooltip="Position of your leading tracked brand in the mention-count ranking."
      />
      <HeroTile
        icon={Percent}
        label="Your share of voice"
        value={summary.yourEntity == null ? "—" : formatPct(summary.yourEntity.shareOfVoice)}
        sub={
          summary.yourEntity == null
            ? "—"
            : `${summary.yourEntity.mentionCount.toLocaleString()} mentions`
        }
        tooltip="Your leading tracked brand's mentions as a share of total in-scope mentions."
      />
      <HeroTile
        icon={TrendingUp}
        label="Your recommendation rate"
        value={
          summary.yourEntity == null || summary.yourEntity.recommendationRate == null
            ? "—"
            : formatPct(summary.yourEntity.recommendationRate)
        }
        sub="recommended / mentioned"
        tooltip="Share of your tracked brand's mentions that are recommendation-flavoured."
      />
      <HeroTile
        icon={Trophy}
        label="Gap to leader"
        value={
          summary.gapToLeader == null ? "—" : `${summary.gapToLeader.toLocaleString()} mentions`
        }
        sub={
          summary.gapToLeader == null
            ? "—"
            : summary.gapToLeader === 0
              ? "tied or leading"
              : `vs ${summary.leader?.name ?? "leader"}`
        }
        tooltip="Mention-count difference between the leader and your leading tracked brand. Zero = leading or tied."
      />
    </div>
  );
}

interface CompetitorHeroSummary {
  totalEntities: number;
  totalMentions: number;
  leader: CompetitorRow | null;
  yourEntity: CompetitorRow | null;
  yourRank: number | null;
  gapToLeader: number | null;
}

/**
 * Roll the merged ranking rows into the six Hero tile values. Picks the
 * tracked brand with the most mentions as "you" (multi-brand workspaces
 * surface their leading tracked entity here; the per-tracker scope in
 * the sidebar already lets the user narrow further).
 *
 * Exported so the math can be unit-tested independently of the React tree.
 */
export function deriveHero(rows: readonly CompetitorRow[]): CompetitorHeroSummary {
  if (rows.length === 0) {
    return {
      totalEntities: 0,
      totalMentions: 0,
      leader: null,
      yourEntity: null,
      yourRank: null,
      gapToLeader: null,
    };
  }
  const totalMentions = rows.reduce((sum, r) => sum + r.mentionCount, 0);
  const leader = rows[0] ?? null;
  const yourEntity = rows.find((r) => r.isTrackedBrand) ?? null;
  const yourRank = yourEntity == null ? null : rows.indexOf(yourEntity) + 1;
  const gapToLeader =
    yourEntity == null || leader == null
      ? null
      : Math.max(0, leader.mentionCount - yourEntity.mentionCount);
  return {
    totalEntities: rows.length,
    totalMentions,
    leader,
    yourEntity,
    yourRank,
    gapToLeader,
  };
}

function HeroTile({
  icon: Icon,
  label,
  value,
  sub,
  tooltip,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tooltip?: string;
}) {
  return (
    <Card>
      <CardContent className="p-2.5">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-neutral-500">
          <Icon size={12} className="text-neutral-400" aria-hidden />
          <span className="truncate">{label}</span>
          {tooltip ? <InfoTooltip label={label} body={tooltip} iconSize={11} /> : null}
        </div>
        <div className="mt-0.5 truncate text-lg font-semibold text-neutral-900">{value}</div>
        <div className="truncate text-[11px] text-neutral-500">{sub}</div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Competitive trend card — one line chart, four metrics behind a toggle
// ---------------------------------------------------------------------------

// The four metrics the user can flip through on /competitors. Each carries
// (a) the BE metric names — `brandMetric` is what tracked-brand series use,
// `competitorMetric` is what competitor series use, since the BE labels
// them differently for some axes — and (b) the chart format ("pct" vs
// "rank") which drives axis formatting + reverseY.
type TrendFormat = "pct" | "rank";
interface TrendMetric {
  value: string;
  label: string;
  brandMetric: string;
  competitorMetric?: string;
  format: TrendFormat;
}
const TREND_METRICS: readonly TrendMetric[] = [
  {
    value: "sov",
    label: "SoV",
    brandMetric: "BrandShareOfVoice",
    competitorMetric: "ShareOfVoice",
    format: "pct",
  },
  {
    value: "mention",
    label: "Mention rate",
    brandMetric: "BrandMentionRate",
    competitorMetric: "MentionRate",
    format: "pct",
  },
  {
    value: "rec",
    label: "Rec. rate",
    brandMetric: "BrandRecommendationRate",
    competitorMetric: "RecommendationRate",
    format: "pct",
  },
  {
    value: "rank",
    label: "Rank",
    brandMetric: "AverageBrandRank",
    competitorMetric: "AverageBrandRank",
    format: "rank",
  },
];

function CompetitiveTrendCard({
  series,
  rows,
}: {
  series: readonly EntityTrendSeriesDto[];
  rows: readonly CompetitorRow[];
}) {
  const [metricValue, setMetricValue] = useState<string>(TREND_METRICS[0].value);
  const metric = TREND_METRICS.find((m) => m.value === metricValue) ?? TREND_METRICS[0];

  // Show the top 5 entities by mention count — keeps the chart legible
  // even when the workspace has dozens of competitors in scope.
  const top5Keys = useMemo(
    () => new Set(rows.slice(0, 5).map((r) => `${r.entityType}:${r.entityId}`)),
    [rows],
  );

  const chartSeries: LineChartSeries[] = useMemo(() => {
    return series
      .filter((s) => {
        if (s.entityType === "Brand") return s.metricName === metric.brandMetric;
        if (!metric.competitorMetric) return false;
        return s.metricName === metric.competitorMetric;
      })
      .filter((s) => top5Keys.has(`${s.entityType}:${s.entityId}`))
      .map((s, i) => ({
        id: s.entityId,
        name: s.entityName,
        color: ENTITY_PALETTE[i % ENTITY_PALETTE.length],
        data: s.points.map((p) => ({ x: p.capturedAt, y: p.value ?? null })),
      }));
  }, [series, top5Keys, metric.brandMetric, metric.competitorMetric]);

  const axis = axisConfigForFormat(metric.format);

  return (
    <CollapsibleCard
      icon={TrendingUp}
      title="Competitive trend"
      tooltip="Per-entity trend for the top 5 by mentions in the selected window. Use the toggle to flip between Share of voice, Mention rate, Recommendation rate, and Rank."
      actions={<TrendMetricToggle value={metricValue} onChange={setMetricValue} />}
    >
      {chartSeries.length === 0 ? (
        <p className="text-sm text-neutral-500">No trend data in the selected window yet.</p>
      ) : (
        <LineChartWrapper
          series={chartSeries}
          formatValue={axis.formatValue}
          minValue={axis.minValue}
          reverseY={axis.reverseY}
          height={180}
        />
      )}
    </CollapsibleCard>
  );
}

function axisConfigForFormat(format: TrendFormat): {
  formatValue: (v: number) => string;
  minValue?: number;
  reverseY?: boolean;
} {
  switch (format) {
    case "pct":
      return { formatValue: (v) => `${Math.round(v * 100)}%`, minValue: 0 };
    case "rank":
      // Rank: lower = better, so flip the Y so rank 1 sits at the top
      // and the line dips downward as the brand falls in the list.
      return { formatValue: (v) => v.toFixed(2), minValue: 1, reverseY: true };
  }
}

function TrendMetricToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Trend metric"
      className="inline-flex rounded-md border border-neutral-300 bg-white p-[1px] shadow-sm"
    >
      {TREND_METRICS.map((m) => {
        const active = m.value === value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            aria-pressed={active}
            aria-label={m.label}
            title={m.label}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold transition",
              active ? "bg-primary-100 text-primary-700" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Movers — gainers + losers between two equal-length windows
// ---------------------------------------------------------------------------

interface MoverRow {
  entityType: string;
  entityId: string;
  name: string;
  isTrackedBrand: boolean;
  currentMentions: number;
  previousMentions: number;
  /** Signed delta of mention count. Positive = gained, negative = lost. */
  delta: number;
  /**
   * Relative change vs the previous window's mention count.
   * Null when previous = 0 (no prior baseline; FE shows "new").
   */
  pctChange: number | null;
}

interface MoversBreakdown {
  gainers: readonly MoverRow[];
  losers: readonly MoverRow[];
}

/**
 * Diff two equal-length windows of competitor rows. Each entity present
 * in either window gets one MoverRow. Sorted by signed delta — gainers
 * descending, losers ascending — and capped at five each so the
 * two-column section reads as a glance.
 *
 * Exported so the diff is testable without React.
 */
export function deriveMovers(
  current: readonly CompetitorRow[],
  previous: readonly CompetitorRow[],
): MoversBreakdown {
  const previousByKey = new Map<string, CompetitorRow>();
  for (const r of previous) {
    previousByKey.set(`${r.entityType}:${r.entityId}`, r);
  }
  const currentByKey = new Map<string, CompetitorRow>();
  for (const r of current) {
    currentByKey.set(`${r.entityType}:${r.entityId}`, r);
  }

  const allKeys = new Set<string>([...currentByKey.keys(), ...previousByKey.keys()]);
  const moverRows: MoverRow[] = [];
  for (const key of allKeys) {
    const cur = currentByKey.get(key);
    const prev = previousByKey.get(key);
    const currentMentions = cur?.mentionCount ?? 0;
    const previousMentions = prev?.mentionCount ?? 0;
    const delta = currentMentions - previousMentions;
    if (delta === 0) continue;
    const sample = cur ?? prev!;
    moverRows.push({
      entityType: sample.entityType,
      entityId: sample.entityId,
      name: sample.name,
      isTrackedBrand: sample.isTrackedBrand,
      currentMentions,
      previousMentions,
      delta,
      pctChange: previousMentions === 0 ? null : delta / previousMentions,
    });
  }

  // Gainers: positive delta, sorted descending. Losers: negative delta,
  // sorted ascending (most negative first). Capped at 5 each.
  const gainers = moverRows
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
  const losers = moverRows
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5);
  return { gainers, losers };
}

function MoversCard({
  currentRows,
  previousRows,
  isComparable,
  isLoadingPrevious,
}: {
  currentRows: readonly CompetitorRow[];
  previousRows: readonly CompetitorRow[];
  isComparable: boolean;
  isLoadingPrevious: boolean;
}) {
  const breakdown = useMemo(
    () => deriveMovers(currentRows, previousRows),
    [currentRows, previousRows],
  );

  if (!isComparable) {
    return (
      <CollapsibleCard
        icon={Zap}
        title="Movers"
        tooltip="Compares the current window against an equal-length window immediately before it."
      >
        <p className="text-sm text-neutral-500">
          Pick a bounded date range to surface gainers and losers — "All time" has no previous
          window to compare against.
        </p>
      </CollapsibleCard>
    );
  }
  if (isLoadingPrevious) {
    return (
      <CollapsibleCard icon={Zap} title="Movers">
        <p className="text-sm text-neutral-500">Comparing windows…</p>
      </CollapsibleCard>
    );
  }
  if (breakdown.gainers.length === 0 && breakdown.losers.length === 0) {
    return (
      <CollapsibleCard icon={Zap} title="Movers">
        <p className="text-sm text-neutral-500">No notable movement this window.</p>
      </CollapsibleCard>
    );
  }
  return (
    <CollapsibleCard
      icon={Zap}
      title="Movers"
      tooltip="Top gainers and losers between the current window and an equal-length window immediately before it."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <MoverColumn
          title="Gainers"
          rows={breakdown.gainers}
          emptyLabel="No gainers in this window."
          positive
        />
        <MoverColumn
          title="Losers"
          rows={breakdown.losers}
          emptyLabel="No losers in this window."
        />
      </div>
    </CollapsibleCard>
  );
}

function MoverColumn({
  title,
  rows,
  emptyLabel,
  positive = false,
}: {
  title: string;
  rows: readonly MoverRow[];
  emptyLabel: string;
  positive?: boolean;
}) {
  const Arrow = positive ? ArrowUp : ArrowDown;
  const accent = positive ? "text-semantic-success-700" : "text-semantic-error-700";
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Arrow size={12} className={accent} aria-hidden />
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-neutral-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
          {rows.map((r) => (
            <li
              key={`${r.entityType}:${r.entityId}`}
              className="flex items-center justify-between px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900">{r.name}</span>
                {r.isTrackedBrand && (
                  <span className="rounded bg-primary-50 px-1.5 py-0 text-[10px] font-semibold text-primary-700">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-neutral-500">
                  {r.previousMentions} → {r.currentMentions}
                </span>
                <span className={cn("font-semibold", accent)}>
                  {r.delta > 0 ? "+" : ""}
                  {r.delta}
                </span>
                <span className="w-12 text-right text-[10px] text-neutral-500">
                  {r.pctChange == null
                    ? "new"
                    : `${r.pctChange > 0 ? "+" : ""}${Math.round(r.pctChange * 100)}%`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
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
// Ranking table
// ---------------------------------------------------------------------------

function CompetitorsTable({ rows }: { rows: readonly CompetitorRow[] }) {
  const copy = REPORTS_COPY.competitors.workspace.filters;
  const actionsCopy = REPORTS_COPY.competitors.workspace.actions;
  const [relationshipFilter, setRelationshipFilter] = useState<CompetitorRelationshipFilter | null>(
    null,
  );
  const [recommendationFilter, setRecommendationFilter] =
    useState<CompetitorRecommendationFilter | null>(null);
  const [selectedRow, setSelectedRow] = useState<CompetitorRow | null>(null);
  const [reportQueue, setReportQueue] = useState<Record<string, CompetitorRow>>({});
  const [trackedCompetitors, setTrackedCompetitors] = useState<Record<string, true>>({});
  const [competitorNotice, setCompetitorNotice] = useState<string | null>(null);
  const filteredRows = useMemo(
    () => filterCompetitorRows(rows, relationshipFilter, recommendationFilter),
    [recommendationFilter, relationshipFilter, rows],
  );
  const relationshipCounts = useMemo(() => countCompetitorsByRelationship(rows), [rows]);
  const recommendationCounts = useMemo(() => countCompetitorsByRecommendation(rows), [rows]);
  const maxMentions = useMemo(
    () => filteredRows.reduce((max, r) => Math.max(max, r.mentionCount), 0),
    [filteredRows],
  );

  function addToReport(row: CompetitorRow) {
    setReportQueue((current) => ({ ...current, [competitorRowKey(row)]: row }));
    setCompetitorNotice(
      REPORTS_COPY.competitors.workspace.drawer.reportNotice.replace("{competitor}", row.name),
    );
  }

  function trackCompetitor(row: CompetitorRow) {
    setTrackedCompetitors((current) => ({ ...current, [competitorRowKey(row)]: true }));
    setCompetitorNotice(
      REPORTS_COPY.competitors.workspace.drawer.trackingNotice.replace("{competitor}", row.name),
    );
  }

  return (
    <div className="space-y-2">
      {competitorNotice && (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-800">
          {competitorNotice}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <CompetitorFilterPills
          counts={relationshipCounts}
          selected={relationshipFilter}
          onSelect={(next) => setRelationshipFilter((current) => (current === next ? null : next))}
        />
        <CompetitorFilterPills
          counts={recommendationCounts}
          selected={recommendationFilter}
          onSelect={(next) =>
            setRecommendationFilter((current) => (current === next ? null : next))
          }
        />
        {(relationshipFilter || recommendationFilter) && (
          <button
            type="button"
            onClick={() => {
              setRelationshipFilter(null);
              setRecommendationFilter(null);
            }}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          >
            {copy.clear}
          </button>
        )}
      </div>
      {filteredRows.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-3 text-xs text-neutral-500">
          {copy.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
              <tr>
                <Th className="w-10 text-right">#</Th>
                <Th>Entity</Th>
                <Th>Relationship</Th>
                <Th className="text-right">Mentions</Th>
                <Th className="text-right">Share of voice</Th>
                <Th className="text-right">Recommendation rate</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredRows.map((row, index) => {
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
                    <Td>
                      <Badge variant={row.isTrackedBrand ? "secondary" : "outline"}>
                        {row.isTrackedBrand ? "You" : "Competitor"}
                      </Badge>
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
                        <span className="text-neutral-900">
                          {formatPct(row.recommendationRate)}
                        </span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRow(row)}>
                        {actionsCopy.openDetails}
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <CompetitorDetailsDrawer
        row={selectedRow}
        rank={selectedRow == null ? null : filteredRows.indexOf(selectedRow) + 1}
        addedToReport={selectedRow ? Boolean(reportQueue[competitorRowKey(selectedRow)]) : false}
        tracked={
          selectedRow
            ? selectedRow.isTrackedBrand ||
              Boolean(trackedCompetitors[competitorRowKey(selectedRow)])
            : false
        }
        onClose={() => setSelectedRow(null)}
        onAddToReport={addToReport}
        onTrackCompetitor={trackCompetitor}
      />
    </div>
  );
}

function CompetitorDetailsDrawer({
  row,
  rank,
  addedToReport,
  tracked,
  onClose,
  onAddToReport,
  onTrackCompetitor,
}: {
  row: CompetitorRow | null;
  rank: number | null;
  addedToReport: boolean;
  tracked: boolean;
  onClose: () => void;
  onAddToReport: (row: CompetitorRow) => void;
  onTrackCompetitor: (row: CompetitorRow) => void;
}) {
  if (!row) return null;

  const copy = REPORTS_COPY.competitors.workspace.drawer;
  const actions = REPORTS_COPY.competitors.workspace.actions;
  const relationship = row.isTrackedBrand ? "You" : "Competitor";
  const recommendationRate =
    row.recommendationRate == null ? copy.noRecommendationData : formatPct(row.recommendationRate);

  return (
    <div className="fixed inset-0 z-50 bg-black/20" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="competitor-details-title"
        className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-neutral-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {copy.title}
            </p>
            <h2
              id="competitor-details-title"
              className="mt-1 text-lg font-semibold text-neutral-900"
            >
              {row.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <DrawerMeta label={copy.relationship} value={relationship} />
            <DrawerMeta label={copy.rank} value={rank == null ? "—" : `#${rank}`} />
            <DrawerMeta label={copy.mentions} value={row.mentionCount.toLocaleString()} />
            <DrawerMeta label={copy.shareOfVoice} value={formatPct(row.shareOfVoice)} />
            <DrawerMeta label={copy.recommendationRate} value={recommendationRate} />
          </div>

          <section>
            <h3 className="text-sm font-semibold text-neutral-900">{copy.recommendedAction}</h3>
            <p className="mt-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              {row.isTrackedBrand ? copy.actionTracked : copy.actionCompetitor}
            </p>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddToReport(row)}
            disabled={addedToReport}
          >
            {addedToReport ? actions.addedToReport : actions.addToReport}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTrackCompetitor(row)}
            disabled={tracked}
          >
            {tracked ? actions.trackedCompetitor : actions.trackCompetitor}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function competitorRowKey(row: CompetitorRow) {
  return `${row.entityType}:${row.entityId}`;
}

function exportCompetitorLeadPlan(rows: readonly CompetitorLeadRow[], range: DateRangeSelection) {
  const payload = JSON.stringify(
    {
      packageType: "competitor-lead-action-plan",
      createdAt: new Date().toISOString(),
      dateRange: serializeDateRange(range),
      leadCount: rows.length,
      leads: rows.map((row) => ({
        id: row.id,
        trackedBrandName: row.trackedBrandName,
        competitorId: row.competitorId,
        competitorName: row.competitorName,
        leadType: row.leadType,
        gap: row.gap,
        brandValue: row.brandValue,
        competitorValue: row.competitorValue,
        recommendedAction: row.recommendedAction,
      })),
    },
    null,
    2,
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `competitor-lead-action-plan-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function serializeDateRange(range: DateRangeSelection) {
  switch (range.kind) {
    case "preset":
      return { kind: "preset", days: range.days };
    case "custom":
      return {
        kind: "custom",
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      };
    case "all":
      return { kind: "all" };
  }
}

function DrawerMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-neutral-900">{value}</p>
    </div>
  );
}

function CompetitorFilterPills<T extends string>({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<T, number>;
  selected: T | null;
  onSelect: (next: T) => void;
}) {
  const entries = Object.entries(counts) as [T, number][];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {entries
        .filter(([, count]) => count > 0)
        .map(([label, count]) => {
          const active = selected === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(label)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
                active
                  ? "border-primary-600 bg-primary-100 text-primary-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
              )}
            >
              <span>{label}</span>
              <span className="tabular-nums text-neutral-400">{count}</span>
            </button>
          );
        })}
    </div>
  );
}

function MentionBar({ count, max }: { count: number; max: number }) {
  const widthPct = max === 0 ? 0 : (count / max) * 100;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-16 overflow-hidden rounded bg-neutral-100 sm:block">
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
