import { useMemo, useState } from "react";
import { ExternalLink, Globe, Link2, Quote, Tag } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
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
import { TopicSelector } from "@/components/molecules/TopicSelector";
import { VISIBILITY_LENSES } from "@/content/lenses";
import {
  InlineChipFilter,
  PLATFORM_LABELS,
  platformLabel,
  SENTIMENT_ORDER,
} from "@/features/reports/components/FilterChips";
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
import { useWorkspaceUrls } from "@/features/reports/hooks/useWorkspaceUrls";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";
import type {
  BrandedDimensionGroupDto,
  SourceTypeReferenceDto,
  WorkspaceDomainRowDto,
  WorkspaceUrlRowDto,
} from "@/types/api";

const ALL_LENS_CODES = VISIBILITY_LENSES.map((l) => l.code);
const EMPTY_GROUPS: readonly BrandedDimensionGroupDto[] = [];
const EMPTY_DOMAIN_ROWS: readonly WorkspaceDomainRowDto[] = [];
const EMPTY_URL_ROWS: readonly WorkspaceUrlRowDto[] = [];

type SourcesView = "domain" | "url";

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
  const [classifyingBrandId, setClassifyingBrandId] = useState<string | null>(null);

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
          // No section anchors — /sources has a single section that
          // swaps via the view toggle.
        />
      </div>
      <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
        <ViewToggle value={view} onChange={setView} />
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
  const filteredRows = filterActive(activeView, query, typeFilter);

  const sections: MetricCategorySection[] = [
    {
      id: "CitedSources",
      label: view === "domain" ? "Cited domains" : "Cited URLs",
      children: (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
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
                  ? "No sources match your search / type filter."
                  : "No URLs match your search / type filter."}
            </p>
          ) : view === "domain" ? (
            <DomainsTable
              rows={filteredRows as readonly WorkspaceDomainRowDto[]}
              classifyingBrandId={effectiveClassifyingBrandId}
              sourceTypes={sourceTypes.data ?? []}
            />
          ) : (
            <UrlsTable
              rows={filteredRows as readonly WorkspaceUrlRowDto[]}
              classifyingBrandId={effectiveClassifyingBrandId}
              sourceTypes={sourceTypes.data ?? []}
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
): readonly (WorkspaceDomainRowDto | WorkspaceUrlRowDto)[] {
  const q = query.trim().toLowerCase();
  if (view.kind === "domain") {
    return view.allRows.filter((r) => {
      if (typeFilter && r.sourceType !== typeFilter) return false;
      if (q === "") return true;
      if (r.sourceName.toLowerCase().includes(q)) return true;
      if (r.normalizedDomain && r.normalizedDomain.toLowerCase().includes(q)) return true;
      return false;
    });
  }
  return view.allRows.filter((r) => {
    if (typeFilter && r.sourceType !== typeFilter) return false;
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
          <InfoTooltip label={label} body={tooltip} iconSize={11} />
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

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function DomainsTable({
  rows,
  classifyingBrandId,
  sourceTypes,
}: {
  rows: readonly WorkspaceDomainRowDto[];
  classifyingBrandId: string | null;
  sourceTypes: readonly SourceTypeReferenceDto[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          <tr>
            <Th>Source</Th>
            <Th>Type</Th>
            <Th className="text-right">Citations</Th>
            <Th className="text-right">Scans</Th>
            <Th className="text-right">Authority</Th>
            <Th>Last seen</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <DomainsRow
              key={row.sourceId}
              row={row}
              classifyingBrandId={classifyingBrandId}
              sourceTypes={sourceTypes}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DomainsRow({
  row,
  classifyingBrandId,
  sourceTypes,
}: {
  row: WorkspaceDomainRowDto;
  classifyingBrandId: string | null;
  sourceTypes: readonly SourceTypeReferenceDto[];
}) {
  const update = useUpdateWorkspaceSourceClassification(classifyingBrandId);
  const errorMessage =
    update.isError && update.variables?.sourceId === row.sourceId
      ? update.error instanceof Error
        ? update.error.message
        : "Save failed — try again."
      : null;
  const canEdit = classifyingBrandId != null && sourceTypes.length > 0;
  return (
    <tr>
      <Td>
        <div className="flex flex-col">
          <span className="text-neutral-900">{row.sourceName}</span>
          {row.normalizedDomain && (
            <span className="text-[10px] text-neutral-500">{row.normalizedDomain}</span>
          )}
        </div>
      </Td>
      <Td>
        {canEdit ? (
          <div className="flex flex-col gap-1">
            <SourceTypeDropdown
              value={row.sourceType}
              onChange={(next) => update.mutate({ sourceId: row.sourceId, sourceType: next })}
              sourceTypes={sourceTypes}
              disabled={update.isPending}
              ariaLabel={`Source type for ${row.sourceName}`}
            />
            {errorMessage && (
              <p className="text-[10px] text-semantic-error-600" role="alert">
                {errorMessage}
              </p>
            )}
          </div>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            {row.sourceType}
          </Badge>
        )}
      </Td>
      <Td className="text-right tabular-nums">{row.citationCount}</Td>
      <Td className="text-right tabular-nums">{row.retrievedInScans}</Td>
      <Td className="text-right tabular-nums">
        {row.authorityScore == null ? (
          <span className="text-neutral-400">—</span>
        ) : (
          <span className="text-neutral-700">{Math.round(row.authorityScore)}</span>
        )}
      </Td>
      <Td>
        {row.lastSeenAt ? (
          formatRelativeDate(row.lastSeenAt)
        ) : (
          <span className="text-neutral-400">never</span>
        )}
      </Td>
    </tr>
  );
}

function UrlsTable({
  rows,
  classifyingBrandId,
  sourceTypes,
}: {
  rows: readonly WorkspaceUrlRowDto[];
  classifyingBrandId: string | null;
  sourceTypes: readonly SourceTypeReferenceDto[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          <tr>
            <Th>URL</Th>
            <Th>Domain · Type</Th>
            <Th className="text-right">Citations</Th>
            <Th className="text-right">Scans</Th>
            <Th>Last seen</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <UrlRow
              key={row.sourceUrlId}
              row={row}
              classifyingBrandId={classifyingBrandId}
              sourceTypes={sourceTypes}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UrlRow({
  row,
  classifyingBrandId,
  sourceTypes,
}: {
  row: WorkspaceUrlRowDto;
  classifyingBrandId: string | null;
  sourceTypes: readonly SourceTypeReferenceDto[];
}) {
  const update = useUpdateWorkspaceSourceClassification(classifyingBrandId);
  // Match by sourceId — multiple URL rows share a Source. The error
  // surfaces on every URL row backed by the failing Source.
  const errorMessage =
    update.isError && update.variables?.sourceId === row.sourceId
      ? update.error instanceof Error
        ? update.error.message
        : "Save failed — try again."
      : null;
  const canEdit = classifyingBrandId != null && sourceTypes.length > 0;
  return (
    <tr>
      <Td>
        <div className="flex flex-col">
          {row.title && <span className="text-neutral-900">{row.title}</span>}
          <a
            href={row.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[10px] text-primary-600 hover:underline"
            title={row.url}
          >
            <span className="max-w-[400px] truncate">{row.normalizedUrl || row.url}</span>
            <ExternalLink className="h-2.5 w-2.5 shrink-0" aria-hidden />
          </a>
        </div>
      </Td>
      <Td>
        <div className="flex flex-col gap-1">
          <span className="text-neutral-900">{row.normalizedDomain ?? row.sourceName}</span>
          {canEdit ? (
            <SourceTypeDropdown
              value={row.sourceType}
              onChange={(next) => update.mutate({ sourceId: row.sourceId, sourceType: next })}
              sourceTypes={sourceTypes}
              disabled={update.isPending}
              ariaLabel={`Source type for ${row.sourceName}`}
            />
          ) : (
            <Badge variant="secondary" className="self-start text-[10px]">
              {row.sourceType}
            </Badge>
          )}
          {errorMessage && (
            <p className="text-[10px] text-semantic-error-600" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      </Td>
      <Td className="text-right tabular-nums">{row.citationCount}</Td>
      <Td className="text-right tabular-nums">{row.retrievedInScans}</Td>
      <Td>
        {row.lastSeenAt ? (
          formatRelativeDate(row.lastSeenAt)
        ) : (
          <span className="text-neutral-400">never</span>
        )}
      </Td>
    </tr>
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
  return <td className={cn("px-3 py-2 align-top text-neutral-700", className)}>{children}</td>;
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
