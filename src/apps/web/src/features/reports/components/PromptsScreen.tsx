import { useMemo, useState } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp, BarChart3, PieChart, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { InlineEdit } from "@/components/atoms/inline-edit";
import { Input } from "@/components/atoms/input";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { DonutChartWrapper, type DonutChartDatum } from "@/components/charts/DonutChartWrapper";
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
import { countryCodeToFlagUrl } from "@/lib/flag";
import { useAudienceCounts } from "@/features/reports/hooks/useAudienceCounts";
import { useDiscoverySummary } from "@/features/reports/hooks/useDiscoverySummary";
import { useMarketCounts } from "@/features/reports/hooks/useMarketCounts";
import { useProductCounts } from "@/features/reports/hooks/useProductCounts";
import { useTopicCounts } from "@/features/reports/hooks/useTopicCounts";
import {
  useRemoveWorkspacePrompt,
  useUpdateWorkspacePrompt,
  useWorkspacePrompts,
} from "@/features/reports/hooks/useWorkspacePrompts";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";
import type { BrandedDimensionGroupDto, WorkspacePromptRowDto } from "@/types/api";

// Canonical lens codes — drives both the default selection and the
// section render order. Matches the Workspace Overview to keep the lens
// taxonomy consistent across reports.
const ALL_LENS_CODES = VISIBILITY_LENSES.map((l) => l.code);

const LENS_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  VISIBILITY_LENSES.map((l) => [l.name, l.code]),
);

// Per-entity palette for the lens-distribution donut. Same hex set as
// the overview's ENTITY_PALETTE so the visual vocabulary across reports
// stays consistent.
const LENS_PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#a855f7"];

// Visibility-rate buckets, in ascending order. The "no data" bucket is
// rendered last so it does not interrupt the gradient.
const VISIBILITY_BUCKETS: ReadonlyArray<{ label: string; min: number; max: number }> = [
  { label: "0–20%", min: 0, max: 0.2 },
  { label: "20–40%", min: 0.2, max: 0.4 },
  { label: "40–60%", min: 0.4, max: 0.6 },
  { label: "60–80%", min: 0.6, max: 0.8 },
  { label: "80–100%", min: 0.8, max: 1.0001 },
];

const EMPTY_GROUPS: readonly BrandedDimensionGroupDto[] = [];

// Friendly display labels for AI platform codes. Falls back to the raw
// code for any platform we don't have a label for yet (e.g. a future
// provider added on the BE before the FE catalog catches up).
const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  openai: "ChatGPT",
  "chatgpt-search": "ChatGPT Search",
  gemini: "Gemini",
  claude: "Claude",
  perplexity: "Perplexity",
  grok: "Grok",
};

function platformLabel(code: string): string {
  return PLATFORM_LABELS[code] ?? code;
}

type SortKey = "default" | "visibility" | "mentions" | "scans" | "lastScan";
type SortDir = "asc" | "desc";

/**
 * Workspace-wide prompt rollup at /prompts. Lens chips at the top double
 * as filter selectors AND section anchors — same model as the Workspace
 * Overview. The page is split into a status strip (summary tiles + lens
 * distribution + visibility histogram) followed by 6 lens-shaped sections,
 * each rendering the prompts in that lens.
 *
 * Phase 1 ships the chrome + section layout + sortable columns + Topics
 * filter. Phase 2 follow-ups: Products / Markets / Audiences filters
 * (need BE-side lookup on the prompt row), and per-prompt drill-down
 * (needs a per-prompt scan-history endpoint).
 */
export function PromptsScreen() {
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [selectedLenses, setSelectedLenses] = useState<readonly string[]>(ALL_LENS_CODES);
  const [selectedTopicNames, setSelectedTopicNames] = useState<string[]>([]);
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const [selectedMarketNames, setSelectedMarketNames] = useState<string[]>([]);
  const [selectedAudienceNames, setSelectedAudienceNames] = useState<string[]>([]);
  const [selectedPlatformCodes, setSelectedPlatformCodes] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const prompts = useWorkspacePrompts(range, trackerIds);
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

  // Filter the workspace prompt list against the active controls. Lens
  // narrowing is a Set lookup on the row's lensName via the code→name
  // map; topic narrowing is an intersection on the row's topics array;
  // platform narrowing is an intersection on the row's platformCodes
  // array; search applies last so it doesn't shortcut the structural
  // filters.
  const filteredPrompts = useMemo(() => {
    if (!prompts.data) return [];
    let rows = prompts.data.prompts;
    if (selectedLenses.length < ALL_LENS_CODES.length) {
      const codeSet = new Set(selectedLenses);
      rows = rows.filter((r) => codeSet.has(LENS_NAME_TO_CODE[r.lensName] ?? ""));
    }
    if (selectedTopicNames.length > 0) {
      const topicSet = new Set(selectedTopicNames);
      rows = rows.filter((r) => r.topics.some((t) => topicSet.has(t)));
    }
    if (selectedProductNames.length > 0) {
      const productSet = new Set(selectedProductNames);
      rows = rows.filter((r) => r.products.some((p) => productSet.has(p)));
    }
    if (selectedMarketNames.length > 0) {
      const marketSet = new Set(selectedMarketNames);
      rows = rows.filter((r) => r.markets.some((m) => marketSet.has(m)));
    }
    if (selectedAudienceNames.length > 0) {
      const audienceSet = new Set(selectedAudienceNames);
      rows = rows.filter((r) => r.audiences.some((a) => audienceSet.has(a)));
    }
    if (selectedPlatformCodes.length > 0) {
      const platformSet = new Set(selectedPlatformCodes);
      rows = rows.filter((r) => r.platformCodes.some((c) => platformSet.has(c)));
    }
    if (query.trim() !== "") {
      rows = filterRows(rows, query);
    }
    return rows;
  }, [
    prompts.data,
    selectedLenses,
    selectedTopicNames,
    selectedProductNames,
    selectedMarketNames,
    selectedAudienceNames,
    selectedPlatformCodes,
    query,
  ]);

  // Distinct platform codes across the unfiltered prompt set drives the
  // Models chip row. Sorted by display label so the chip order stays
  // stable as the underlying scope changes.
  const availablePlatformCodes = useMemo<string[]>(() => {
    if (!prompts.data) return [];
    const set = new Set<string>();
    for (const p of prompts.data.prompts) for (const c of p.platformCodes) set.add(c);
    return Array.from(set).sort((a, b) => platformLabel(a).localeCompare(platformLabel(b)));
  }, [prompts.data]);

  // Per-lens prompt counts feed both the lens chip badges and the
  // distribution donut. We count on the full (unsearched) lens set so
  // the chip badges stay stable while the user types a search query.
  const promptCountsByLensCode = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    if (!prompts.data) return counts;
    for (const code of ALL_LENS_CODES) counts[code] = 0;
    for (const p of prompts.data.prompts) {
      const code = LENS_NAME_TO_CODE[p.lensName];
      if (code) counts[code] = (counts[code] ?? 0) + 1;
    }
    return counts;
  }, [prompts.data]);

  if (prompts.isLoading) return <LoadingPage />;
  if (prompts.isError) {
    return (
      <ErrorPage
        error={prompts.error instanceof Error ? prompts.error : undefined}
        onReset={() => void prompts.refetch()}
      />
    );
  }
  if (!prompts.data) return null;

  // Build sections only for selected lenses. Empty lens-buckets are
  // dropped so the page does not render placeholder gaps for lenses
  // that have no in-scope prompts after filtering.
  const sections: MetricCategorySection[] = [];
  for (const code of ALL_LENS_CODES) {
    if (!selectedLenses.includes(code)) continue;
    const lens = VISIBILITY_LENSES.find((l) => l.code === code);
    if (!lens) continue;
    const rowsForLens = filteredPrompts.filter((r) => LENS_NAME_TO_CODE[r.lensName] === code);
    if (rowsForLens.length === 0) continue;
    const sortedRows = sortPrompts(rowsForLens, sortBy, sortDir);
    sections.push({
      id: code,
      label: lens.name,
      children: (
        <PromptsTable
          rows={sortedRows}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(key) => {
            // Click same column = flip direction; click new column = set
            // it and default to descending (largest first).
            if (key === sortBy) setSortDir(sortDir === "asc" ? "desc" : "asc");
            else {
              setSortBy(key);
              setSortDir("desc");
            }
          }}
        />
      ),
    });
  }

  const activeFilterCount =
    (selectedTopicNames.length > 0 ? 1 : 0) +
    (selectedProductNames.length > 0 ? 1 : 0) +
    (selectedMarketNames.length > 0 ? 1 : 0) +
    (selectedAudienceNames.length > 0 ? 1 : 0) +
    (selectedPlatformCodes.length > 0 ? 1 : 0);

  const controlsStrip = (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <LensChipRow
        selectedCodes={selectedLenses}
        onChange={setSelectedLenses}
        onActivate={(code) => {
          const el = document.getElementById(code);
          if (el && typeof el.scrollIntoView === "function") {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        countsByCode={promptCountsByLensCode}
      />
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Input
          inputSize="sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prompts…"
          aria-label="Filter prompts"
          className="w-48"
        />
        <FiltersPopover
          activeCount={activeFilterCount}
          onClearAll={() => {
            setSelectedTopicNames([]);
            setSelectedProductNames([]);
            setSelectedMarketNames([]);
            setSelectedAudienceNames([]);
            setSelectedPlatformCodes([]);
          }}
        >
          <FiltersPopoverRow label="Topics" active={selectedTopicNames.length > 0}>
            <TopicSelector
              topicsByBrand={topicsByBrand}
              selectedNames={selectedTopicNames}
              onChange={setSelectedTopicNames}
              countsByName={topicCountsByName}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Products & Services" active={selectedProductNames.length > 0}>
            <ProductSelector
              productsByBrand={productsByBrand}
              selectedNames={selectedProductNames}
              onChange={setSelectedProductNames}
              countsByName={productCountsByName}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Markets" active={selectedMarketNames.length > 0}>
            <MarketSelector
              marketsByBrand={marketsByBrand}
              selectedNames={selectedMarketNames}
              onChange={setSelectedMarketNames}
              countsByName={marketCountsByName}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Audiences" active={selectedAudienceNames.length > 0}>
            <AudienceSelector
              audiencesByBrand={audiencesByBrand}
              selectedNames={selectedAudienceNames}
              onChange={setSelectedAudienceNames}
              countsByName={audienceCountsByName}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Models" active={selectedPlatformCodes.length > 0}>
            <PlatformChipFilter
              availableCodes={availablePlatformCodes}
              selectedCodes={selectedPlatformCodes}
              onChange={setSelectedPlatformCodes}
            />
          </FiltersPopoverRow>
        </FiltersPopover>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Prompts">
        <DateRangePicker value={range} onChange={setRange} />
      </PageHeader>

      {prompts.data.prompts.length === 0 ? (
        <>
          {controlsStrip}
          <Card>
            <CardContent className="p-8 text-center text-sm text-neutral-600">
              No active prompts in scope yet. Trackers populate this page once their prompts are
              confirmed.
            </CardContent>
          </Card>
        </>
      ) : (
        <MetricCategoryLayout
          statusStrip={
            <TopSection
              prompts={filteredPrompts}
              totalCount={prompts.data.prompts.length}
              promptCountsByLensCode={promptCountsByLensCode}
            />
          }
          controlsStrip={controlsStrip}
          sections={sections}
          renderNav={() => null}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top section — summary tiles + lens distribution donut + visibility histogram
// ---------------------------------------------------------------------------

interface TopSectionProps {
  prompts: readonly WorkspacePromptRowDto[];
  totalCount: number;
  promptCountsByLensCode: Readonly<Record<string, number>>;
}

function TopSection({ prompts, totalCount, promptCountsByLensCode }: TopSectionProps) {
  const summary = useMemo(() => deriveSummary(prompts), [prompts]);

  const donutSlices: DonutChartDatum[] = useMemo(() => {
    return VISIBILITY_LENSES.map((lens, i) => ({
      id: lens.code,
      label: lens.name,
      value: promptCountsByLensCode[lens.code] ?? 0,
      color: LENS_PALETTE[i % LENS_PALETTE.length],
    })).filter((s) => s.value > 0);
  }, [promptCountsByLensCode]);

  const histogramData: BarChartDatum[] = useMemo(() => {
    return VISIBILITY_BUCKETS.map((b) => ({
      label: b.label,
      value: prompts.filter(
        (p) => p.visibilityRate != null && p.visibilityRate >= b.min && p.visibilityRate < b.max,
      ).length,
    }));
  }, [prompts]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Prompts in view"
          value={prompts.length.toLocaleString()}
          sub={`of ${totalCount.toLocaleString()}`}
          tooltip="In-scope prompts after lens, topic, model, and search filters — out of the workspace total."
        />
        <SummaryTile
          label="% with mentions"
          value={
            summary.withMentionsPct == null ? "—" : `${Math.round(summary.withMentionsPct * 100)}%`
          }
          sub={`${summary.withMentionsCount.toLocaleString()} prompts`}
          tooltip="Share of in-view prompts whose tracked brand was mentioned at least once in this window."
        />
        <SummaryTile
          label="Avg visibility"
          value={
            summary.avgVisibility == null ? "—" : `${Math.round(summary.avgVisibility * 100)}%`
          }
          sub={
            summary.measuredCount === 0
              ? "no data"
              : `${summary.measuredCount.toLocaleString()} measured`
          }
          tooltip="Mean per-prompt visibility rate across in-view prompts that produced at least one in-window answer."
        />
        <SummaryTile
          label="Avg mentions / prompt"
          value={summary.avgMentions == null ? "—" : summary.avgMentions.toFixed(1)}
          sub={
            summary.totalMentions === 0
              ? "no data"
              : `${summary.totalMentions.toLocaleString()} total`
          }
          tooltip="Mean tracked-brand mention count per in-view prompt during the selected window."
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <CollapsibleCard
          icon={PieChart}
          title="Prompts by lens"
          tooltip="How in-view prompts split across the six Visibility Lenses. Empty lenses are dropped."
        >
          {donutSlices.length === 0 ? (
            <p className="text-sm text-neutral-500">No prompts in scope.</p>
          ) : (
            <DonutChartWrapper
              data={donutSlices}
              formatValue={(v) => `${v} prompt${v === 1 ? "" : "s"}`}
              height={220}
            />
          )}
        </CollapsibleCard>
        <CollapsibleCard
          icon={BarChart3}
          title="Visibility distribution"
          tooltip="In-view prompts bucketed by visibility rate. Counts only prompts with at least one in-window answer."
        >
          {prompts.length === 0 ? (
            <p className="text-sm text-neutral-500">No prompts in scope.</p>
          ) : (
            <BarChartWrapper data={histogramData} valueAxisLabel="Prompts" height={220} />
          )}
        </CollapsibleCard>
      </div>
    </div>
  );
}

// Inline chip multi-select for the Models filter row inside the
// FiltersPopover. The platform universe is small (~4–6 in practice)
// so a chip strip reads cleaner than a search-able dropdown like the
// TopicSelector. Empty selection = "no filter applied".
function PlatformChipFilter({
  availableCodes,
  selectedCodes,
  onChange,
}: {
  availableCodes: readonly string[];
  selectedCodes: readonly string[];
  onChange: (next: string[]) => void;
}) {
  if (availableCodes.length === 0) {
    return <span className="text-xs text-neutral-400">No models in scope.</span>;
  }
  const selectedSet = new Set(selectedCodes);
  function toggle(code: string) {
    if (selectedSet.has(code)) onChange(selectedCodes.filter((c) => c !== code));
    else onChange([...selectedCodes, code]);
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {availableCodes.map((code) => {
        const label = platformLabel(code);
        const pressed = selectedSet.has(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            aria-pressed={pressed}
            aria-label={`Filter by ${label}`}
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition",
              pressed
                ? "border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            {label}
          </button>
        );
      })}
      {selectedCodes.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="ml-1 text-[11px] font-medium text-primary-600 hover:text-primary-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  tooltip,
}: {
  label: string;
  value: string;
  sub: string;
  /** Optional explanatory copy for the ⓘ. When omitted, the ⓘ still renders with the project default placeholder body so the affordance is consistent across tiles. */
  tooltip?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-neutral-500">
          <span className="truncate">{label}</span>
          <InfoTooltip label={label} body={tooltip} iconSize={12} />
        </div>
        <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
        <div className="text-[11px] text-neutral-500">{sub}</div>
      </CardContent>
    </Card>
  );
}

interface PromptsSummary {
  withMentionsCount: number;
  withMentionsPct: number | null;
  measuredCount: number;
  avgVisibility: number | null;
  totalMentions: number;
  avgMentions: number | null;
}

/**
 * Roll up the filtered prompt list into the four KPI tile values. Exported
 * for testability — keeps the math separate from the React tree.
 */
export function deriveSummary(prompts: readonly WorkspacePromptRowDto[]): PromptsSummary {
  if (prompts.length === 0) {
    return {
      withMentionsCount: 0,
      withMentionsPct: null,
      measuredCount: 0,
      avgVisibility: null,
      totalMentions: 0,
      avgMentions: null,
    };
  }
  const withMentionsCount = prompts.filter((p) => p.brandMentionCount > 0).length;
  const measured = prompts.filter(
    (p): p is WorkspacePromptRowDto & { visibilityRate: number } => p.visibilityRate != null,
  );
  const avgVisibility =
    measured.length === 0
      ? null
      : measured.reduce((s, p) => s + p.visibilityRate, 0) / measured.length;
  const totalMentions = prompts.reduce((s, p) => s + p.brandMentionCount, 0);
  return {
    withMentionsCount,
    withMentionsPct: withMentionsCount / prompts.length,
    measuredCount: measured.length,
    avgVisibility,
    totalMentions,
    avgMentions: totalMentions / prompts.length,
  };
}

// ---------------------------------------------------------------------------
// Search filter — pure + exported for testing
// ---------------------------------------------------------------------------

export function filterRows(
  rows: readonly WorkspacePromptRowDto[],
  query: string,
): WorkspacePromptRowDto[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [...rows];
  return rows.filter((r) => {
    if (r.text.toLowerCase().includes(q)) return true;
    if (r.lensName.toLowerCase().includes(q)) return true;
    if (r.topics.some((t) => t.toLowerCase().includes(q))) return true;
    if (r.trackerName.toLowerCase().includes(q)) return true;
    if (r.brandName.toLowerCase().includes(q)) return true;
    return false;
  });
}

// ---------------------------------------------------------------------------
// Sort helper — pure + exported for testing
// ---------------------------------------------------------------------------

export function sortPrompts(
  rows: readonly WorkspacePromptRowDto[],
  sortBy: SortKey,
  sortDir: SortDir,
): WorkspacePromptRowDto[] {
  if (sortBy === "default") return [...rows];
  // Nulls always sort to the bottom regardless of direction — they
  // represent "no data" and should not crowd the top whether the user
  // asked for ascending or descending.
  const mul = sortDir === "asc" ? 1 : -1;
  const value = (p: WorkspacePromptRowDto): number | null => {
    switch (sortBy) {
      case "visibility":
        return p.visibilityRate;
      case "mentions":
        return p.brandMentionCount;
      case "scans":
        return p.scanCount;
      case "lastScan":
        return p.lastScanAt == null ? null : new Date(p.lastScanAt).getTime();
    }
  };
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return (va - vb) * mul;
  });
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

interface PromptsTableProps {
  rows: readonly WorkspacePromptRowDto[];
  sortBy: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey) => void;
}

function PromptsTable({ rows, sortBy, sortDir, onSortChange }: PromptsTableProps) {
  const update = useUpdateWorkspacePrompt();
  const remove = useRemoveWorkspacePrompt();
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          <tr>
            <Th>Prompt</Th>
            <Th>Topics</Th>
            <Th>Country</Th>
            <Th>Tracker</Th>
            <SortableTh
              column="visibility"
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={onSortChange}
              align="right"
            >
              Visibility
            </SortableTh>
            <Th>Sentiment</Th>
            <SortableTh
              column="mentions"
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={onSortChange}
              align="right"
            >
              Mentions
            </SortableTh>
            <SortableTh
              column="lastScan"
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={onSortChange}
            >
              Activity
            </SortableTh>
            <Th className="w-6">
              <span className="sr-only">Remove</span>
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <PromptRow
              key={row.promptId}
              row={row}
              onEdit={(text) =>
                update.mutate({ trackerId: row.trackerId, promptId: row.promptId, text })
              }
              onRemove={() => remove.mutate({ trackerId: row.trackerId, promptId: row.promptId })}
              isRemoving={remove.isPending}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromptRow({
  row,
  onEdit,
  onRemove,
  isRemoving,
}: {
  row: WorkspacePromptRowDto;
  onEdit: (text: string) => void;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <tr>
      <Td>
        <InlineEdit
          value={row.text}
          onChange={(next) => {
            if (next.trim().length > 0 && next !== row.text) {
              onEdit(next);
            }
          }}
          multiline
          placeholder="Prompt text"
        />
      </Td>
      <Td>
        <div className="flex flex-wrap items-center gap-1">
          {row.topics.slice(0, 3).map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">
              {t}
            </Badge>
          ))}
          {row.topics.length > 3 && (
            <span className="text-[10px] text-neutral-400">+{row.topics.length - 3}</span>
          )}
        </div>
      </Td>
      <Td>
        <CountryCell codes={row.marketCountryCodes} />
      </Td>
      <Td>
        <div className="flex flex-col">
          <span className="text-neutral-900">{row.brandName}</span>
          <span className="text-[10px] text-neutral-500">{row.trackerName}</span>
        </div>
      </Td>
      <Td className="text-right tabular-nums">
        <VisibilityCell rate={row.visibilityRate} avgPosition={row.averageFirstMentionPosition} />
      </Td>
      <Td>
        {row.dominantSentiment ? (
          <Badge variant={sentimentVariant(row.dominantSentiment)} className="text-[10px]">
            {row.dominantSentiment}
          </Badge>
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </Td>
      <Td className="text-right tabular-nums">
        {row.brandMentionCount === 0 ? (
          <span className="text-neutral-400">—</span>
        ) : (
          <span className="text-neutral-900">{row.brandMentionCount}</span>
        )}
      </Td>
      <Td>
        <div className="flex flex-col gap-0.5">
          <span className="text-neutral-700">
            {row.lastScanAt ? (
              formatRelativeDate(row.lastScanAt)
            ) : (
              <span className="text-neutral-400">never</span>
            )}
          </span>
          <span className="text-[10px] text-neutral-500">
            {row.scanCount} {row.scanCount === 1 ? "scan" : "scans"}
            {row.platformCodes.length > 0 && ` · ${row.platformCodes.join(", ")}`}
          </span>
        </div>
      </Td>
      <Td className="w-6">
        <button
          type="button"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove prompt ${row.text}`}
          className="rounded-sm p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-50"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      </Td>
    </tr>
  );
}

// Renders one flagcdn SVG per ISO-3166 country code on the row. Country-
// less markets (e.g. "Global") contribute no codes and fall through to
// the em-dash placeholder. Codes that aren't valid alpha-2 fall back to
// rendering the raw code chip so we still surface the value rather than
// silently dropping it.
function CountryCell({ codes }: { codes: readonly string[] }) {
  if (codes.length === 0) return <span className="text-neutral-400">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {codes.map((code) => {
        const url = countryCodeToFlagUrl(code);
        if (!url) {
          return (
            <span
              key={code}
              className="rounded bg-neutral-100 px-1 py-0.5 text-[10px] font-medium uppercase text-neutral-600"
            >
              {code}
            </span>
          );
        }
        return (
          <img
            key={code}
            src={url}
            alt={code.toUpperCase()}
            title={code.toUpperCase()}
            className="h-3 w-4 rounded-[2px] object-cover ring-1 ring-neutral-200"
          />
        );
      })}
    </div>
  );
}

function VisibilityCell({
  rate,
  avgPosition,
}: {
  rate: number | null;
  avgPosition: number | null;
}) {
  if (rate == null) return <span className="text-neutral-400">—</span>;
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-neutral-900">{Math.round(rate * 100)}%</span>
      {avgPosition != null && (
        <span className="text-[10px] text-neutral-500">pos {avgPosition.toFixed(2)}</span>
      )}
    </div>
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
    default:
      return "secondary";
  }
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("px-3 py-2 text-left text-[10px] font-medium", className)}>
      {children}
    </th>
  );
}

interface SortableThProps {
  column: SortKey;
  sortBy: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}

function SortableTh({
  column,
  sortBy,
  sortDir,
  onSortChange,
  align = "left",
  children,
}: SortableThProps) {
  const active = sortBy === column;
  const Icon = !active ? ArrowDownUp : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      className={cn("px-3 py-2 text-[10px] font-medium", align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={() => onSortChange(column)}
        aria-label={`Sort by ${column}`}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition-colors",
          active ? "text-primary-700" : "text-neutral-500 hover:text-neutral-700",
          align === "right" && "justify-end",
        )}
      >
        <span>{children}</span>
        <Icon size={10} aria-hidden className={active ? "text-primary-500" : "text-neutral-400"} />
      </button>
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-top text-neutral-700", className)}>{children}</td>;
}

/** Compact "2d ago" / "3h ago" / "just now" string for a recent timestamp. */
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
