import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  Calendar,
  ExternalLink,
  Globe,
  Link2,
  Quote,
  ScatterChart as ScatterIcon,
  Tag,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { LineChartWrapper, type LineChartSeries } from "@/components/charts/LineChartWrapper";
import { CollapsibleCard } from "@/components/molecules/CollapsibleCard";
import { DataTable } from "@/components/molecules/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { AudienceSelector } from "@/components/molecules/AudienceSelector";
import {
  DateRangePicker,
  defaultDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { ErrorPage } from "@/components/molecules/ErrorPage";
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
import { SourceTypeDropdown } from "@/components/molecules/SourceTypeDropdown";
import { REPORTS_COPY } from "@/content/reports";
import { TopicSelector } from "@/components/molecules/TopicSelector";
import { VISIBILITY_LENSES } from "@/content/lenses";
import {
  InlineChipFilter,
  PLATFORM_LABELS,
  platformLabel,
  SENTIMENT_ORDER,
} from "@/features/reports/components/FilterChips";
import { DomainTypesCard } from "@/features/reports/components/DomainTypesCard";
import { useAudienceCounts } from "@/features/reports/hooks/useAudienceCounts";
import { useDiscoverySummary } from "@/features/reports/hooks/useDiscoverySummary";
import { useMarketCounts } from "@/features/reports/hooks/useMarketCounts";
import { useProductCounts } from "@/features/reports/hooks/useProductCounts";
import { useSourceTypes } from "@/features/reports/hooks/useSourceTypes";
import { useTopicCounts } from "@/features/reports/hooks/useTopicCounts";
import {
  useUpdateWorkspaceSourceClassification,
  useWorkspaceBrandsForClassification,
} from "@/features/reports/hooks/useUpdateWorkspaceSourceClassification";
import { useWorkspaceDomains } from "@/features/reports/hooks/useWorkspaceDomains";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import { useWorkspaceUrls } from "@/features/reports/hooks/useWorkspaceUrls";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { previousSelectionFor } from "@/lib/previousWindow";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  BrandedDimensionGroupDto,
  DomainTypeShareDto,
  EntityTrendSeriesDto,
  SourceTypeReferenceDto,
  WorkspaceDomainRowDto,
  WorkspaceUrlRowDto,
} from "@/types/api";

const ALL_LENS_CODES = VISIBILITY_LENSES.map((l) => l.code);
const EMPTY_GROUPS: readonly BrandedDimensionGroupDto[] = [];
const EMPTY_DOMAIN_ROWS: readonly WorkspaceDomainRowDto[] = [];
const EMPTY_URL_ROWS: readonly WorkspaceUrlRowDto[] = [];
const EMPTY_SERIES: readonly EntityTrendSeriesDto[] = [];

// Per-line palette for the owned-share trend — matches the entity
// palette used across /overview + /competitors so the tracked brand
// reads in the same primary purple wherever it appears.
const TREND_PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#a855f7"];

// Authority-band buckets. Inclusive at the lower bound, exclusive at
// the upper, with the final band closed on both ends so 100 lands in
// the top bucket.
const AUTHORITY_BANDS: ReadonlyArray<{ label: string; min: number; max: number }> = [
  { label: "0–20", min: 0, max: 20 },
  { label: "20–40", min: 20, max: 40 },
  { label: "40–60", min: 40, max: 60 },
  { label: "60–80", min: 60, max: 80 },
  { label: "80–100", min: 80, max: 100.0001 },
];

type SourcesView = "domain" | "url";
type SourceRelationship = "Owned" | "Third-party" | "Unknown";
type SourceDetailsRow = WorkspaceDomainRowDto | WorkspaceUrlRowDto;

/**
 * Workspace-wide citation source view at /sources. One screen, two
 * views: Domain rollup vs URL detail. Adopts the canonical page shell
 * (title-only PageHeader → MetricCategoryLayout with Hero KPIs +
 * sticky single-row controls strip + a single section with the active
 * table). View toggle lives in the controls strip beside the date
 * picker; switching view doesn't re-fetch (both hooks fire in
 * parallel up front).
 *
 * Filter state matches /overview + /competitors: lens / topics /
 * products / markets / audiences / sentiment / platforms. All seven
 * thread through both useWorkspaceDomains + useWorkspaceUrls and the
 * BE narrows the underlying citation set via PromptRun-level EXISTS
 * subqueries. Source classification mutates the underlying Source
 * (not the URL), so a flip on a URL row updates every URL backed by
 * the same Source after the cache invalidates.
 */
export function SourcesScreen() {
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [view, setView] = useState<SourcesView>("domain");
  const [selectedLenses, setSelectedLenses] = useState<readonly string[]>(ALL_LENS_CODES);
  const [selectedTopicNames, setSelectedTopicNames] = useState<string[]>([]);
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const [selectedMarketNames, setSelectedMarketNames] = useState<string[]>([]);
  const [selectedAudienceNames, setSelectedAudienceNames] = useState<string[]>([]);
  const [selectedPlatformCodes, setSelectedPlatformCodes] = useState<string[]>([]);
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>([]);

  // Table-local controls (search + type pill + classifying-brand picker)
  // live below the canonical bar — they apply to whichever table is
  // active rather than the workspace-wide BE narrow.
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [relationshipFilter, setRelationshipFilter] = useState<SourceRelationship | null>(null);
  const [classifyingBrandId, setClassifyingBrandId] = useState<string | null>(null);
  const [sourceReportQueue, setSourceReportQueue] = useState<Record<string, SourceDetailsRow>>({});
  const [ignoredSources, setIgnoredSources] = useState<Record<string, true>>({});
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);

  // Pass NO_LENS_FILTER through to the BE when every lens is selected
  // (cross-lens view); narrow when the user picks a subset. Matches
  // the sentinel pattern used on /overview + /prompts + /competitors.
  const lensCodesForApi = selectedLenses.length === ALL_LENS_CODES.length ? [] : selectedLenses;

  const domains = useWorkspaceDomains(
    range,
    trackerIds,
    lensCodesForApi,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
    selectedSentiments,
    selectedPlatformCodes,
  );
  const urls = useWorkspaceUrls(
    range,
    trackerIds,
    lensCodesForApi,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
    selectedSentiments,
    selectedPlatformCodes,
  );
  // Workspace overview feeds the Owned-citation-share trend card —
  // we read `series` filtered to BrandOwnedCitationShare. Same filter
  // dimensions as the sources hooks so the trend stays aligned.
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
  // Second domains fetch at the equal-length back-shifted window — feeds
  // the Movers card. React-Query keys collapse to the same entry when
  // the current selection is "All time" (no meaningful previous), so
  // there's no extra network in that case.
  const previousSelection = useMemo(() => previousSelectionFor(range), [range]);
  const previousDomains = useWorkspaceDomains(
    previousSelection,
    trackerIds,
    lensCodesForApi,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
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

  const brands = useWorkspaceBrandsForClassification();
  const sourceTypes = useSourceTypes();
  const brandsList = brands.data ?? [];
  const effectiveClassifyingBrandId =
    classifyingBrandId ?? (brandsList.length > 0 ? brandsList[0].id : null);
  const effectiveClassifyingBrandName =
    brandsList.find((brand) => brand.id === effectiveClassifyingBrandId)?.name ?? null;

  // Hero KPIs roll up from BOTH queries so the four-tile strip reads
  // the same regardless of which view is active. Citations is
  // total-across-domains (every citation goes through a Source, so
  // domain rows are the authoritative count). Top type picks the
  // sourceType with the highest citation share across domains.
  // Hoisted above the loading/error guards so the hook order is
  // stable on every render — empty arrays as the placeholder until
  // the data lands.
  const domainRows = domains.data?.domains ?? EMPTY_DOMAIN_ROWS;
  const urlRows = urls.data?.urls ?? EMPTY_URL_ROWS;
  const hero = useMemo(() => deriveHero(domainRows, urlRows), [domainRows, urlRows]);
  // Source-type breakdown for the donut — same DomainTypeShareDto[]
  // shape /overview consumes, but computed locally so the donut
  // respects the page's filter bar instead of staying workspace-wide.
  const domainTypeShares = useMemo(() => deriveTypeShares(domainRows), [domainRows]);
  const relationshipShares = useMemo(
    () => deriveRelationshipShares(domainRows, effectiveClassifyingBrandName),
    [domainRows, effectiveClassifyingBrandName],
  );
  // Authority-score buckets feed the per-band citation bar chart.
  const authorityBuckets = useMemo(() => deriveAuthorityBuckets(domainRows), [domainRows]);
  // Authority × citations scatter — one dot per source with both axes
  // present. Null-authority rows drop.
  const scatterPoints = useMemo(() => deriveScatterPoints(domainRows), [domainRows]);
  // Freshness buckets — categorical bins of last-seen recency.
  const freshnessBuckets = useMemo(() => deriveFreshnessBuckets(domainRows), [domainRows]);
  // Movers — gainers + losers vs the previous-window domain rows.
  const previousDomainRows = previousDomains.data?.domains ?? EMPTY_DOMAIN_ROWS;
  const moversBreakdown = useMemo(
    () => deriveSourceMovers(domainRows, previousDomainRows),
    [domainRows, previousDomainRows],
  );
  const isMoversComparable = range.kind !== "all";

  // Domain + URL queries fire in parallel. We block on the active
  // view's primary query for the LoadingPage decision so the page
  // doesn't flash whenever the inactive query is fetching. ErrorPage
  // surfaces the active query's error.
  const primary = view === "domain" ? domains : urls;
  if (primary.isLoading) return <LoadingPage />;
  if (primary.isError) {
    return (
      <ErrorPage
        error={primary.error instanceof Error ? primary.error : undefined}
        onReset={() => void primary.refetch()}
      />
    );
  }
  if (!domains.data || !urls.data) return null;

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
          // No section anchors — the table view (domain vs URL) toggles
          // inside the Cited section, not via lens anchors here.
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

  // Single section that swaps body based on the view toggle. Search +
  // type-pill + classifying-brand picker live inside the section
  // because they apply to whichever table is active rather than the
  // workspace-wide narrow.
  const activeView: ActiveView =
    view === "domain" ? { kind: "domain", allRows: domainRows } : { kind: "url", allRows: urlRows };
  const typeCounts = countByType(activeView);
  const relationshipCounts = countByRelationship(activeView, effectiveClassifyingBrandName);
  const filteredRows = filterActive(
    activeView,
    query,
    typeFilter,
    relationshipFilter,
    effectiveClassifyingBrandName,
  ).filter((row) => !ignoredSources[sourceRowKey(row)]);

  function addSourceToReport(row: SourceDetailsRow) {
    setSourceReportQueue((current) => ({ ...current, [sourceRowKey(row)]: row }));
    setSourceNotice(
      REPORTS_COPY.sources.workspace.drawer.reportNotice.replace("{source}", row.sourceName),
    );
  }

  function ignoreSource(row: SourceDetailsRow) {
    setIgnoredSources((current) => ({ ...current, [sourceRowKey(row)]: true }));
    setSourceNotice(
      REPORTS_COPY.sources.workspace.drawer.ignoreNotice.replace("{source}", row.sourceName),
    );
  }

  const sections: MetricCategorySection[] = [
    {
      id: "Context",
      label: "Citation context",
      // Top-of-page snapshot pair — source-type mix (donut) + owned
      // citation share trend. Now a regular section so the filter bar
      // sits directly under the Hero KPIs.
      children: (
        <div className="grid gap-3 lg:grid-cols-3">
          <DomainTypesCard rows={domainTypeShares} />
          <RelationshipMixCard rows={relationshipShares} />
          <OwnedShareTrendCard series={overview.data?.series ?? EMPTY_SERIES} />
        </div>
      ),
    },
    {
      id: "Authority",
      label: "Authority",
      // Distribution bar + scatter sit side-by-side — same theme, two
      // lenses: distribution = "how many citations at each band",
      // scatter = "which sources fall where on authority vs volume".
      children: (
        <div className="grid gap-4 md:grid-cols-2">
          <AuthorityDistributionCard buckets={authorityBuckets} />
          <AuthorityScatterCard points={scatterPoints} />
        </div>
      ),
    },
    {
      id: "Activity",
      label: "Activity",
      // Recency-of-citation breakdown + movers vs previous window.
      // Both lenses on "how the citation set is moving over time."
      children: (
        <div className="grid gap-4 md:grid-cols-2">
          <FreshnessCard buckets={freshnessBuckets} />
          <SourceMoversCard
            breakdown={moversBreakdown}
            isComparable={isMoversComparable}
            isLoadingPrevious={previousDomains.isLoading || previousDomains.isFetching}
          />
        </div>
      ),
    },
    {
      id: "CitedSources",
      label: view === "domain" ? "Cited domains" : "Cited URLs",
      children: (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            <Input
              inputSize="sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                view === "domain"
                  ? "Filter by source name or domain…"
                  : "Filter by URL, title, or domain…"
              }
              aria-label={view === "domain" ? "Filter sources" : "Filter URLs"}
              className="max-w-sm"
            />
            <TypeFilterPills
              counts={typeCounts}
              selected={typeFilter}
              onSelect={(t) => setTypeFilter((current) => (current === t ? null : t))}
            />
            <RelationshipFilterPills
              counts={relationshipCounts}
              selected={relationshipFilter}
              onSelect={(next) =>
                setRelationshipFilter((current) => (current === next ? null : next))
              }
            />
            {brandsList.length > 1 && (
              <ClassifyingBrandPicker
                brands={brandsList.map((b) => ({ id: b.id, name: b.name }))}
                value={effectiveClassifyingBrandId}
                onChange={setClassifyingBrandId}
              />
            )}
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-xs text-neutral-500">
              {activeView.allRows.length === 0
                ? view === "domain"
                  ? "No cited sources match the current filters. Once scans complete with citations, this page populates automatically."
                  : "No cited URLs match the current filters. Mentioned-source citations without a URL still show up under the Domains view."
                : view === "domain"
                  ? "No sources match your search / type / relationship filter."
                  : "No URLs match your search / type / relationship filter."}
            </p>
          ) : view === "domain" ? (
            <DomainsTable
              rows={filteredRows as readonly WorkspaceDomainRowDto[]}
              classifyingBrandId={effectiveClassifyingBrandId}
              classifyingBrandName={effectiveClassifyingBrandName}
              sourceTypes={sourceTypes.data ?? []}
              reportQueue={sourceReportQueue}
              onAddToReport={addSourceToReport}
              onIgnore={ignoreSource}
            />
          ) : (
            <UrlsTable
              rows={filteredRows as readonly WorkspaceUrlRowDto[]}
              classifyingBrandId={effectiveClassifyingBrandId}
              classifyingBrandName={effectiveClassifyingBrandName}
              sourceTypes={sourceTypes.data ?? []}
              reportQueue={sourceReportQueue}
              onAddToReport={addSourceToReport}
              onIgnore={ignoreSource}
            />
          )}
        </div>
      ),
    },
  ];

  const noDataAtAll = domainRows.length === 0 && urlRows.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Sources" />

      {sourceNotice && (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-800">
          {sourceNotice}
        </div>
      )}

      {noDataAtAll ? (
        <>
          {controlsStrip}
          <Card>
            <CardContent className="p-8 text-center text-sm text-neutral-600">
              No cited sources in scope yet. Once scans complete with citations, this page populates
              automatically.
            </CardContent>
          </Card>
        </>
      ) : (
        <MetricCategoryLayout
          // statusStrip is the Hero KPI row only; the filter bar comes
          // right under it (sticky). Donut + trend moved into the
          // first section ("Citation context") so the filter bar sits
          // directly beneath the Hero rather than past two more cards.
          statusStrip={<SourcesHero hero={hero} />}
          controlsStrip={controlsStrip}
          sections={sections}
          renderNav={() => null}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source-type breakdown — aggregates citations per SourceType from the
// filtered domain rows. Output shape matches DomainTypeShareDto so the
// extracted DomainTypesCard can render either /sources (filtered,
// computed-here) or /overview (workspace-aggregate, BE-provided).
// ---------------------------------------------------------------------------

export function deriveTypeShares(rows: readonly WorkspaceDomainRowDto[]): DomainTypeShareDto[] {
  if (rows.length === 0) return [];
  const totals = new Map<string, number>();
  for (const r of rows) {
    totals.set(r.sourceType, (totals.get(r.sourceType) ?? 0) + r.citationCount);
  }
  const grandTotal = [...totals.values()].reduce((s, n) => s + n, 0);
  if (grandTotal === 0) return [];
  return [...totals.entries()]
    .map(([sourceType, citationCount]) => ({
      sourceType,
      citationCount,
      share: citationCount / grandTotal,
    }))
    .sort((a, b) => b.citationCount - a.citationCount);
}

// ---------------------------------------------------------------------------
// Authority-band buckets — total citations per authority band.
// ---------------------------------------------------------------------------

export interface RelationshipShare {
  relationship: SourceRelationship;
  citationCount: number;
  share: number;
}

export function deriveRelationshipShares(
  rows: readonly WorkspaceDomainRowDto[],
  classifyingBrandName: string | null,
): RelationshipShare[] {
  const totals = new Map<SourceRelationship, number>();
  for (const row of rows) {
    const relationship = classifySourceRelationship(row, classifyingBrandName);
    totals.set(relationship, (totals.get(relationship) ?? 0) + row.citationCount);
  }

  const grandTotal = [...totals.values()].reduce((sum, count) => sum + count, 0);
  if (grandTotal === 0) return [];

  return [...totals.entries()]
    .map(([relationship, citationCount]) => ({
      relationship,
      citationCount,
      share: citationCount / grandTotal,
    }))
    .sort((a, b) => b.citationCount - a.citationCount);
}

function RelationshipMixCard({ rows }: { rows: readonly RelationshipShare[] }) {
  const data: BarChartDatum[] = rows.map((row) => ({
    label: row.relationship,
    value: row.citationCount,
  }));

  return (
    <CollapsibleCard
      icon={Globe}
      title="Citation relationship mix"
      tooltip="Source relationship is inferred from the selected classifying brand and source/domain text until backend-owned relationship labels are available."
    >
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500">No relationship data in this window yet.</p>
      ) : (
        <BarChartWrapper
          data={data}
          valueAxisLabel="Relationship citations"
          formatValue={(value) => value.toLocaleString()}
        />
      )}
    </CollapsibleCard>
  );
}

export interface AuthorityBucket {
  label: string;
  citations: number;
  sourceCount: number;
}

export function deriveAuthorityBuckets(
  rows: readonly WorkspaceDomainRowDto[],
): readonly AuthorityBucket[] {
  return AUTHORITY_BANDS.map((band) => {
    let citations = 0;
    let sourceCount = 0;
    for (const r of rows) {
      if (r.authorityScore == null) continue;
      if (r.authorityScore >= band.min && r.authorityScore < band.max) {
        citations += r.citationCount;
        sourceCount += 1;
      }
    }
    return { label: band.label, citations, sourceCount };
  });
}

function AuthorityDistributionCard({ buckets }: { buckets: readonly AuthorityBucket[] }) {
  const totalCitations = buckets.reduce((s, b) => s + b.citations, 0);
  const data: BarChartDatum[] = buckets.map((b) => ({ label: b.label, value: b.citations }));
  return (
    <CollapsibleCard
      icon={Award}
      title="Authority distribution"
      tooltip="Citations bucketed by source authority score (0–100). Sources without a curated authority score (null) are excluded. Higher bands = more reputable; a left-skewed chart means the AI is leaning on fringe sources."
    >
      {totalCitations === 0 ? (
        <p className="text-sm text-neutral-500">
          No authority data in this window. Sources without a curated authority score don't
          contribute to this chart.
        </p>
      ) : (
        <BarChartWrapper
          data={data}
          valueAxisLabel="Citations"
          formatValue={(v) => v.toLocaleString()}
        />
      )}
    </CollapsibleCard>
  );
}

// ---------------------------------------------------------------------------
// Owned-citation-share trend — single-metric line chart, no switcher
// (citations are inherently a single-metric story on this page).
// ---------------------------------------------------------------------------

function OwnedShareTrendCard({ series }: { series: readonly EntityTrendSeriesDto[] }) {
  // Only tracked-brand series matter for owned-share — competitors
  // don't have an "owned" notion for the workspace's brands.
  const chartSeries: LineChartSeries[] = useMemo(() => {
    return series
      .filter((s) => s.entityType === "Brand")
      .filter(
        (s) => s.metricName === "BrandOwnedCitationShare" || s.metricName === "OwnedCitationShare",
      )
      .map((s, i) => ({
        id: s.entityId,
        name: s.entityName,
        color: TREND_PALETTE[i % TREND_PALETTE.length],
        data: s.points.map((p) => ({ x: p.capturedAt, y: p.value ?? null })),
      }));
  }, [series]);
  return (
    <CollapsibleCard
      icon={TrendingUp}
      title="Owned citation share over time"
      tooltip="Per-tracked-brand share of in-window citations that point at a domain you own. Tracks how much of the AI's citation appetite your owned content captures."
    >
      {chartSeries.length === 0 ? (
        <p className="text-sm text-neutral-500">No owned-citation trend data in this window yet.</p>
      ) : (
        <LineChartWrapper
          series={chartSeries}
          formatValue={(v) => `${Math.round(v * 100)}%`}
          minValue={0}
          height={180}
        />
      )}
    </CollapsibleCard>
  );
}

// ---------------------------------------------------------------------------
// Authority × citations scatter — each source as a dot
// ---------------------------------------------------------------------------

export interface ScatterPoint {
  sourceId: string;
  name: string;
  authority: number;
  citations: number;
}

export function deriveScatterPoints(
  rows: readonly WorkspaceDomainRowDto[],
): readonly ScatterPoint[] {
  const out: ScatterPoint[] = [];
  for (const r of rows) {
    if (r.authorityScore == null) continue;
    out.push({
      sourceId: r.sourceId,
      name: r.sourceName,
      authority: r.authorityScore,
      citations: r.citationCount,
    });
  }
  return out;
}

function AuthorityScatterCard({ points }: { points: readonly ScatterPoint[] }) {
  return (
    <CollapsibleCard
      icon={ScatterIcon}
      title="Authority × citations"
      tooltip="Each cited source plotted by authority (x) and citation count (y). Top-right = strong signals. Top-left = AI leaning on weak sources. Bottom-right = high-authority opportunities the AI isn't citing yet."
    >
      {points.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No sources with both an authority score and citations in window.
        </p>
      ) : (
        <div style={{ height: 280 }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                dataKey="authority"
                name="Authority"
                domain={[0, 100]}
                tickCount={6}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                label={{
                  value: "Authority score",
                  position: "insideBottom",
                  offset: -10,
                  style: { fontSize: 10, fill: "#6b7280" },
                }}
              />
              <YAxis
                type="number"
                dataKey="citations"
                name="Citations"
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                label={{
                  value: "Citations",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 10, fill: "#6b7280" },
                }}
              />
              <ZAxis range={[50, 50]} />
              <RechartsTooltip
                cursor={{ strokeDasharray: "3 3" }}
                labelFormatter={() => ""}
                contentStyle={{ fontSize: 11 }}
              />
              <Scatter name="Sources" data={[...points]} fill="#6366f1" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </CollapsibleCard>
  );
}

// ---------------------------------------------------------------------------
// Citation freshness — buckets by last-seen recency
// ---------------------------------------------------------------------------

export interface FreshnessBucket {
  label: string;
  sourceCount: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function deriveFreshnessBuckets(
  rows: readonly WorkspaceDomainRowDto[],
  now: Date = new Date(),
): readonly FreshnessBucket[] {
  let today = 0;
  let week = 0;
  let month = 0;
  let older = 0;
  let never = 0;
  for (const r of rows) {
    if (!r.lastSeenAt) {
      never += 1;
      continue;
    }
    const ageMs = now.getTime() - new Date(r.lastSeenAt).getTime();
    const ageDays = ageMs / ONE_DAY_MS;
    if (ageDays <= 1) today += 1;
    else if (ageDays <= 7) week += 1;
    else if (ageDays <= 30) month += 1;
    else older += 1;
  }
  return [
    { label: "Today", sourceCount: today },
    { label: "This week", sourceCount: week },
    { label: "This month", sourceCount: month },
    { label: "Older", sourceCount: older },
    { label: "Never", sourceCount: never },
  ];
}

function FreshnessCard({ buckets }: { buckets: readonly FreshnessBucket[] }) {
  const total = buckets.reduce((s, b) => s + b.sourceCount, 0);
  const data: BarChartDatum[] = buckets.map((b) => ({ label: b.label, value: b.sourceCount }));
  return (
    <CollapsibleCard
      icon={Calendar}
      title="Citation freshness"
      tooltip="Distinct sources binned by how recently the AI last cited them. A right-skewed chart means sources are showing up consistently; left-skewed means the AI is rotating fast or running out of fresh material."
    >
      {total === 0 ? (
        <p className="text-sm text-neutral-500">No citation activity in this window.</p>
      ) : (
        <BarChartWrapper
          data={data}
          valueAxisLabel="Sources"
          formatValue={(v) => v.toLocaleString()}
        />
      )}
    </CollapsibleCard>
  );
}

// ---------------------------------------------------------------------------
// Movers — gainers + losers in citation count vs the previous window
// ---------------------------------------------------------------------------

interface SourceMoverRow {
  sourceId: string;
  name: string;
  currentCitations: number;
  previousCitations: number;
  delta: number;
  pctChange: number | null;
}

interface SourceMoversBreakdown {
  gainers: readonly SourceMoverRow[];
  losers: readonly SourceMoverRow[];
}

export function deriveSourceMovers(
  current: readonly WorkspaceDomainRowDto[],
  previous: readonly WorkspaceDomainRowDto[],
): SourceMoversBreakdown {
  const prevByKey = new Map<string, WorkspaceDomainRowDto>();
  for (const r of previous) prevByKey.set(r.sourceId, r);
  const curByKey = new Map<string, WorkspaceDomainRowDto>();
  for (const r of current) curByKey.set(r.sourceId, r);

  const all = new Set<string>([...curByKey.keys(), ...prevByKey.keys()]);
  const movers: SourceMoverRow[] = [];
  for (const key of all) {
    const cur = curByKey.get(key);
    const prev = prevByKey.get(key);
    const currentCitations = cur?.citationCount ?? 0;
    const previousCitations = prev?.citationCount ?? 0;
    const delta = currentCitations - previousCitations;
    if (delta === 0) continue;
    const sample = cur ?? prev!;
    movers.push({
      sourceId: sample.sourceId,
      name: sample.sourceName,
      currentCitations,
      previousCitations,
      delta,
      pctChange: previousCitations === 0 ? null : delta / previousCitations,
    });
  }
  const gainers = movers
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
  const losers = movers
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5);
  return { gainers, losers };
}

function SourceMoversCard({
  breakdown,
  isComparable,
  isLoadingPrevious,
}: {
  breakdown: SourceMoversBreakdown;
  isComparable: boolean;
  isLoadingPrevious: boolean;
}) {
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
      tooltip="Top gainers and losers in citation count between the current window and an equal-length window immediately before it."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SourceMoverColumn
          title="Gainers"
          rows={breakdown.gainers}
          emptyLabel="No gainers this window."
          positive
        />
        <SourceMoverColumn
          title="Losers"
          rows={breakdown.losers}
          emptyLabel="No losers this window."
        />
      </div>
    </CollapsibleCard>
  );
}

function SourceMoverColumn({
  title,
  rows,
  emptyLabel,
  positive = false,
}: {
  title: string;
  rows: readonly SourceMoverRow[];
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
            <li key={r.sourceId} className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="font-medium text-neutral-900">{r.name}</span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-neutral-500">
                  {r.previousCitations} → {r.currentCitations}
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
// Active-view discriminated union — keeps the table-local filter / count
// helpers type-safe without sprinkling string conditionals.
// ---------------------------------------------------------------------------

type ActiveView =
  | { kind: "domain"; allRows: readonly WorkspaceDomainRowDto[] }
  | { kind: "url"; allRows: readonly WorkspaceUrlRowDto[] };

/** Case-insensitive query + optional sourceType filter on the active view. */
export function filterActive(
  view: ActiveView,
  query: string,
  typeFilter: string | null,
  relationshipFilter: SourceRelationship | null = null,
  classifyingBrandName: string | null = null,
): readonly (WorkspaceDomainRowDto | WorkspaceUrlRowDto)[] {
  const q = query.trim().toLowerCase();
  if (view.kind === "domain") {
    return view.allRows.filter((r) => {
      if (typeFilter && r.sourceType !== typeFilter) return false;
      if (
        relationshipFilter &&
        classifySourceRelationship(r, classifyingBrandName) !== relationshipFilter
      ) {
        return false;
      }
      if (q === "") return true;
      if (r.sourceName.toLowerCase().includes(q)) return true;
      if (r.normalizedDomain && r.normalizedDomain.toLowerCase().includes(q)) return true;
      return false;
    });
  }
  return view.allRows.filter((r) => {
    if (typeFilter && r.sourceType !== typeFilter) return false;
    if (
      relationshipFilter &&
      classifySourceRelationship(r, classifyingBrandName) !== relationshipFilter
    ) {
      return false;
    }
    if (q === "") return true;
    if (r.url.toLowerCase().includes(q)) return true;
    if (r.title && r.title.toLowerCase().includes(q)) return true;
    if (r.normalizedDomain && r.normalizedDomain.toLowerCase().includes(q)) return true;
    if (r.sourceName.toLowerCase().includes(q)) return true;
    return false;
  });
}

/** Counts per SourceType across the unfiltered active view. */
export function countByType(view: ActiveView): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of view.allRows) {
    out[r.sourceType] = (out[r.sourceType] ?? 0) + 1;
  }
  return out;
}

export function countByRelationship(
  view: ActiveView,
  classifyingBrandName: string | null,
): Record<SourceRelationship, number> {
  const out: Record<SourceRelationship, number> = {
    Owned: 0,
    "Third-party": 0,
    Unknown: 0,
  };
  for (const row of view.allRows) {
    const relationship = classifySourceRelationship(row, classifyingBrandName);
    out[relationship] += 1;
  }
  return out;
}

export function classifySourceRelationship(
  row: Pick<WorkspaceDomainRowDto | WorkspaceUrlRowDto, "sourceName" | "normalizedDomain">,
  classifyingBrandName: string | null,
): SourceRelationship {
  if (classifyingBrandName == null || classifyingBrandName.trim() === "") return "Unknown";
  const haystack = `${row.sourceName} ${row.normalizedDomain ?? ""}`.toLowerCase();
  if (haystack.trim() === "") return "Unknown";

  const brandTokens = classifyingBrandName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
  if (brandTokens.length === 0) return "Unknown";
  return brandTokens.some((token) => haystack.includes(token)) ? "Owned" : "Third-party";
}

// ---------------------------------------------------------------------------
// Hero KPI strip
// ---------------------------------------------------------------------------

interface SourcesHeroSummary {
  totalCitations: number;
  uniqueDomains: number;
  uniqueUrls: number;
  topType: { type: string; share: number } | null;
}

/**
 * Roll the active workspace state into the four KPI tile values.
 * Citations is the total across DOMAINS — every citation goes through a
 * Source, so that's the authoritative count; URLs may be lower because
 * mentioned-source citations skip the URL view. Top type picks the
 * sourceType carrying the largest share of the citation total.
 *
 * Exported for unit testing independent of React.
 */
export function deriveHero(
  domainRows: readonly WorkspaceDomainRowDto[],
  urlRows: readonly WorkspaceUrlRowDto[],
): SourcesHeroSummary {
  const totalCitations = domainRows.reduce((sum, r) => sum + r.citationCount, 0);
  const uniqueDomains = domainRows.length;
  const uniqueUrls = urlRows.length;
  if (totalCitations === 0) {
    return { totalCitations: 0, uniqueDomains, uniqueUrls, topType: null };
  }
  const citationsByType = new Map<string, number>();
  for (const r of domainRows) {
    citationsByType.set(r.sourceType, (citationsByType.get(r.sourceType) ?? 0) + r.citationCount);
  }
  let topTypeName = "";
  let topTypeCount = -1;
  for (const [type, count] of citationsByType) {
    if (count > topTypeCount) {
      topTypeName = type;
      topTypeCount = count;
    }
  }
  return {
    totalCitations,
    uniqueDomains,
    uniqueUrls,
    topType: { type: topTypeName, share: topTypeCount / totalCitations },
  };
}

function SourcesHero({ hero }: { hero: SourcesHeroSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <HeroTile
        icon={Quote}
        label="Citations"
        value={hero.totalCitations.toLocaleString()}
        sub={hero.totalCitations === 0 ? "no citations yet" : "across all sources"}
        tooltip="Total citations across every Source cited in window."
      />
      <HeroTile
        icon={Globe}
        label="Domains"
        value={hero.uniqueDomains.toLocaleString()}
        sub="unique sources"
        tooltip="Distinct sources (domain rollup) cited at least once in window."
      />
      <HeroTile
        icon={Link2}
        label="URLs"
        value={hero.uniqueUrls.toLocaleString()}
        sub="distinct pages"
        tooltip="Distinct URLs cited at least once. Mentioned-source citations without a URL skip the URL view."
      />
      <HeroTile
        icon={Tag}
        label="Top type"
        value={hero.topType?.type ?? "—"}
        sub={
          hero.topType == null
            ? "no classification yet"
            : `${Math.round(hero.topType.share * 100)}% of citations`
        }
        tooltip="Source type carrying the largest share of citations. Classification is brand-contextual — the workspace picks the dominant label per source."
      />
    </div>
  );
}

function HeroTile({
  icon: Icon,
  label,
  value,
  sub,
  tooltip,
}: {
  icon: typeof Globe;
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
// Controls strip — view toggle + classifying-brand picker + type pills
// ---------------------------------------------------------------------------

function ViewToggle({
  value,
  onChange,
}: {
  value: SourcesView;
  onChange: (next: SourcesView) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Sources view"
      className="inline-flex rounded-md border border-neutral-300 bg-white p-[1px] shadow-sm"
    >
      {(
        [
          { value: "domain", label: "Domains" },
          { value: "url", label: "URLs" },
        ] as const
      ).map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold transition",
              active ? "bg-primary-100 text-primary-700" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ClassifyingBrandPicker({
  brands,
  value,
  onChange,
}: {
  brands: readonly { id: string; name: string }[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-neutral-500">Classifying for</span>
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger selectSize="sm" className="w-[160px]" aria-label="Classifying for brand">
          <SelectValue placeholder="Pick a brand" />
        </SelectTrigger>
        <SelectContent>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TypeFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (t: string) => void;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {entries.map(([type, count]) => {
        const isSelected = selected === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            aria-pressed={isSelected}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
              isSelected
                ? "border-primary-600 bg-primary-100 text-primary-700"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            <span>{type}</span>
            <span className="tabular-nums text-neutral-400">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function RelationshipFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<SourceRelationship, number>;
  selected: SourceRelationship | null;
  onSelect: (relationship: SourceRelationship) => void;
}) {
  const relationships: readonly SourceRelationship[] = ["Owned", "Third-party", "Unknown"];
  const entries = relationships
    .map((relationship) => [relationship, counts[relationship]] as const)
    .filter(([, count]) => count > 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {entries.map(([relationship, count]) => {
        const isSelected = selected === relationship;
        return (
          <button
            key={relationship}
            type="button"
            onClick={() => onSelect(relationship)}
            aria-pressed={isSelected}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
              isSelected
                ? "border-primary-600 bg-primary-100 text-primary-700"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            <span>{relationship}</span>
            <span className="tabular-nums text-neutral-400">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function DomainsTable({
  rows,
  classifyingBrandId,
  classifyingBrandName,
  sourceTypes,
  reportQueue,
  onAddToReport,
  onIgnore,
}: {
  rows: readonly WorkspaceDomainRowDto[];
  classifyingBrandId: string | null;
  classifyingBrandName: string | null;
  sourceTypes: readonly SourceTypeReferenceDto[];
  reportQueue: Record<string, SourceDetailsRow>;
  onAddToReport: (row: SourceDetailsRow) => void;
  onIgnore: (row: SourceDetailsRow) => void;
}) {
  const [selectedRow, setSelectedRow] = useState<WorkspaceDomainRowDto | null>(null);
  const columns = useMemo<ColumnDef<WorkspaceDomainRowDto, unknown>[]>(
    () => [
      {
        accessorKey: "sourceName",
        header: "Source",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-neutral-900">{row.original.sourceName}</span>
            {row.original.normalizedDomain && (
              <span className="text-[10px] text-neutral-500">{row.original.normalizedDomain}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "sourceType",
        header: "Type",
        cell: ({ row }) => (
          <SourceTypeCell
            sourceId={row.original.sourceId}
            sourceName={row.original.sourceName}
            sourceType={row.original.sourceType}
            classifyingBrandId={classifyingBrandId}
            sourceTypes={sourceTypes}
          />
        ),
      },
      {
        id: "relationship",
        header: "Relationship",
        cell: ({ row }) => (
          <RelationshipBadge
            relationship={classifySourceRelationship(row.original, classifyingBrandName)}
          />
        ),
      },
      {
        accessorKey: "citationCount",
        header: "Citations",
        meta: { align: "right" },
      },
      {
        accessorKey: "retrievedInScans",
        header: "Scans",
        meta: { align: "right" },
      },
      {
        accessorKey: "authorityScore",
        header: "Authority",
        meta: { align: "right" },
        cell: ({ row }) =>
          row.original.authorityScore == null ? (
            <span className="text-neutral-400">—</span>
          ) : (
            <span className="text-neutral-700">{Math.round(row.original.authorityScore)}</span>
          ),
        // Null-aware sort: place null authority at the bottom regardless
        // of direction so "no data" doesn't crowd the top of the column.
        sortingFn: (a, b) =>
          nullableNumericSort(a.original.authorityScore, b.original.authorityScore),
      },
      {
        accessorKey: "lastSeenAt",
        header: "Last seen",
        cell: ({ row }) =>
          row.original.lastSeenAt ? (
            formatRelativeDate(row.original.lastSeenAt)
          ) : (
            <span className="text-neutral-400">never</span>
          ),
        sortingFn: (a, b) => nullableDateSort(a.original.lastSeenAt, b.original.lastSeenAt),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { align: "right", cellClassName: "min-w-64" },
        cell: ({ row }) => (
          <SourceRowActions
            row={row.original}
            addedToReport={Boolean(reportQueue[sourceRowKey(row.original)])}
            onView={() => setSelectedRow(row.original)}
            onAddToReport={onAddToReport}
            onIgnore={onIgnore}
          />
        ),
      },
    ],
    [classifyingBrandId, classifyingBrandName, onAddToReport, onIgnore, reportQueue, sourceTypes],
  );

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.sourceId}
        initialSorting={[{ id: "citationCount", desc: true }]}
        emptyMessage="No sources match the current filters."
      />
      <SourceDetailsDrawer
        row={selectedRow}
        relationship={
          selectedRow == null ? null : classifySourceRelationship(selectedRow, classifyingBrandName)
        }
        addedToReport={selectedRow ? Boolean(reportQueue[sourceRowKey(selectedRow)]) : false}
        onClose={() => setSelectedRow(null)}
        onAddToReport={onAddToReport}
        onIgnore={onIgnore}
      />
    </>
  );
}

function UrlsTable({
  rows,
  classifyingBrandId,
  classifyingBrandName,
  sourceTypes,
  reportQueue,
  onAddToReport,
  onIgnore,
}: {
  rows: readonly WorkspaceUrlRowDto[];
  classifyingBrandId: string | null;
  classifyingBrandName: string | null;
  sourceTypes: readonly SourceTypeReferenceDto[];
  reportQueue: Record<string, SourceDetailsRow>;
  onAddToReport: (row: SourceDetailsRow) => void;
  onIgnore: (row: SourceDetailsRow) => void;
}) {
  const [selectedRow, setSelectedRow] = useState<WorkspaceUrlRowDto | null>(null);
  const columns = useMemo<ColumnDef<WorkspaceUrlRowDto, unknown>[]>(
    () => [
      {
        // URL column carries title (optional) + the normalized URL with
        // an external-link affordance. Sort by title when present,
        // falling back to the URL string.
        id: "url",
        accessorFn: (r) => r.title ?? r.normalizedUrl ?? r.url,
        header: "URL",
        cell: ({ row }) => (
          <div className="flex flex-col">
            {row.original.title && <span className="text-neutral-900">{row.original.title}</span>}
            <a
              href={row.original.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[10px] text-primary-600 hover:underline"
              title={row.original.url}
            >
              <span className="max-w-[400px] truncate">
                {row.original.normalizedUrl || row.original.url}
              </span>
              <ExternalLink className="h-2.5 w-2.5 shrink-0" aria-hidden />
            </a>
          </div>
        ),
      },
      {
        id: "domainAndType",
        accessorFn: (r) => r.normalizedDomain ?? r.sourceName,
        header: "Domain · Type",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="text-neutral-900">
              {row.original.normalizedDomain ?? row.original.sourceName}
            </span>
            <SourceTypeCell
              sourceId={row.original.sourceId}
              sourceName={row.original.sourceName}
              sourceType={row.original.sourceType}
              classifyingBrandId={classifyingBrandId}
              sourceTypes={sourceTypes}
            />
          </div>
        ),
      },
      {
        id: "relationship",
        header: "Relationship",
        cell: ({ row }) => (
          <RelationshipBadge
            relationship={classifySourceRelationship(row.original, classifyingBrandName)}
          />
        ),
      },
      {
        accessorKey: "citationCount",
        header: "Citations",
        meta: { align: "right" },
      },
      {
        accessorKey: "retrievedInScans",
        header: "Scans",
        meta: { align: "right" },
      },
      {
        accessorKey: "lastSeenAt",
        header: "Last seen",
        cell: ({ row }) =>
          row.original.lastSeenAt ? (
            formatRelativeDate(row.original.lastSeenAt)
          ) : (
            <span className="text-neutral-400">never</span>
          ),
        sortingFn: (a, b) => nullableDateSort(a.original.lastSeenAt, b.original.lastSeenAt),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { align: "right", cellClassName: "min-w-64" },
        cell: ({ row }) => (
          <SourceRowActions
            row={row.original}
            addedToReport={Boolean(reportQueue[sourceRowKey(row.original)])}
            onView={() => setSelectedRow(row.original)}
            onAddToReport={onAddToReport}
            onIgnore={onIgnore}
          />
        ),
      },
    ],
    [classifyingBrandId, classifyingBrandName, onAddToReport, onIgnore, reportQueue, sourceTypes],
  );

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.sourceUrlId}
        initialSorting={[{ id: "citationCount", desc: true }]}
        emptyMessage="No URLs match the current filters."
      />
      <SourceDetailsDrawer
        row={selectedRow}
        relationship={
          selectedRow == null ? null : classifySourceRelationship(selectedRow, classifyingBrandName)
        }
        addedToReport={selectedRow ? Boolean(reportQueue[sourceRowKey(selectedRow)]) : false}
        onClose={() => setSelectedRow(null)}
        onAddToReport={onAddToReport}
        onIgnore={onIgnore}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared SourceType cell — shared between the Domains and URLs tables.
// Owns the classification mutation; the dropdown only renders when the
// active brand has source-types data loaded.
// ---------------------------------------------------------------------------

function RelationshipBadge({ relationship }: { relationship: SourceRelationship }) {
  const variant =
    relationship === "Owned" ? "success" : relationship === "Third-party" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="whitespace-nowrap text-[10px]">
      {relationship}
    </Badge>
  );
}

function SourceRowActions({
  row,
  addedToReport,
  onView,
  onAddToReport,
  onIgnore,
}: {
  row: SourceDetailsRow;
  addedToReport: boolean;
  onView: () => void;
  onAddToReport: (row: SourceDetailsRow) => void;
  onIgnore: (row: SourceDetailsRow) => void;
}) {
  const copy = REPORTS_COPY.sources.workspace.actions;
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onView}>
        {copy.viewCitedAnswers}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddToReport(row)}
        disabled={addedToReport}
      >
        {addedToReport ? copy.addedToReport : copy.addToReport}
      </Button>
      <Button variant="outline" size="sm" onClick={() => onIgnore(row)}>
        {copy.ignore}
      </Button>
    </div>
  );
}

function SourceDetailsDrawer({
  row,
  relationship,
  addedToReport,
  onClose,
  onAddToReport,
  onIgnore,
}: {
  row: SourceDetailsRow | null;
  relationship: SourceRelationship | null;
  addedToReport: boolean;
  onClose: () => void;
  onAddToReport: (row: SourceDetailsRow) => void;
  onIgnore: (row: SourceDetailsRow) => void;
}) {
  if (row == null) return null;

  const copy = REPORTS_COPY.sources.workspace.drawer;
  const actions = REPORTS_COPY.sources.workspace.actions;
  const isUrlRow = "url" in row;
  const authority =
    "authorityScore" in row && row.authorityScore != null
      ? Math.round(row.authorityScore).toString()
      : copy.noData;
  const normalizedUrl = isUrlRow ? row.normalizedUrl || row.url : null;
  const meta = [
    { label: copy.source, value: row.sourceName },
    { label: copy.domain, value: row.normalizedDomain ?? copy.noData },
    ...(isUrlRow ? [{ label: copy.url, value: normalizedUrl ?? copy.noData }] : []),
    { label: copy.type, value: row.sourceType },
    { label: copy.relationship, value: relationship ?? copy.noData },
    { label: copy.citations, value: row.citationCount.toLocaleString() },
    { label: copy.scans, value: row.retrievedInScans.toLocaleString() },
    ...(!isUrlRow ? [{ label: copy.authority, value: authority }] : []),
    {
      label: copy.lastSeen,
      value: row.lastSeenAt ? formatRelativeDate(row.lastSeenAt) : copy.noData,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-details-title"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-neutral-200 bg-white shadow-xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            {copy.title}
          </p>
          <h2 id="source-details-title" className="truncate text-lg font-semibold text-neutral-900">
            {row.sourceName}
          </h2>
        </div>
        <Button variant="ghost" size="icon" aria-label={copy.close} onClick={onClose}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {meta.map((item) => (
            <SourceDrawerMeta key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-600">
          {copy.citedAnswers}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddToReport(row)}
          disabled={addedToReport}
        >
          {addedToReport ? actions.addedToReport : actions.addToReport}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onIgnore(row)}>
          {actions.ignore}
        </Button>
      </div>
    </div>
  );
}

function sourceRowKey(row: SourceDetailsRow) {
  return "sourceUrlId" in row ? `url:${row.sourceUrlId}` : `source:${row.sourceId}`;
}

function SourceDrawerMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-neutral-900">{value}</div>
    </div>
  );
}

function SourceTypeCell({
  sourceId,
  sourceName,
  sourceType,
  classifyingBrandId,
  sourceTypes,
}: {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  classifyingBrandId: string | null;
  sourceTypes: readonly SourceTypeReferenceDto[];
}) {
  const update = useUpdateWorkspaceSourceClassification(classifyingBrandId);
  const errorMessage =
    update.isError && update.variables?.sourceId === sourceId
      ? update.error instanceof Error
        ? update.error.message
        : "Save failed — try again."
      : null;
  const canEdit = classifyingBrandId != null && sourceTypes.length > 0;
  if (!canEdit) {
    return (
      <Badge variant="secondary" className="self-start text-[10px]">
        {sourceType}
      </Badge>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <SourceTypeDropdown
        value={sourceType}
        onChange={(next) => update.mutate({ sourceId, sourceType: next })}
        sourceTypes={sourceTypes}
        disabled={update.isPending}
        ariaLabel={`Source type for ${sourceName}`}
      />
      {errorMessage && (
        <p className="text-[10px] text-semantic-error-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// Numeric sort that always pushes nulls to the bottom, regardless of
// whether the column is asc or desc. tanstack-react-table's default
// sort treats nulls as the smallest value, which crowds them at the
// top on ascending.
function nullableNumericSort(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function nullableDateSort(a: string | null | undefined, b: string | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}

function formatRelativeDate(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return "in future";
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    return `${months}mo ago`;
  } catch {
    return iso;
  }
}
