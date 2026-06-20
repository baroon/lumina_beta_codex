import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  BarChart3,
  Download,
  FilePlus,
  PieChart,
  Plus,
  X,
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { InlineEdit } from "@/components/atoms/inline-edit";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
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
import { REPORTS_COPY } from "@/content/reports";
import { TopicSelector } from "@/components/molecules/TopicSelector";
import { VISIBILITY_LENSES } from "@/content/lenses";
import {
  InlineChipFilter,
  PLATFORM_LABELS,
  platformLabel,
  SENTIMENT_ORDER,
} from "@/features/reports/components/FilterChips";
import { PromptAnswerHistoryDrawer } from "@/features/reports/components/PromptAnswerHistoryDrawer";
import {
  countQuestionsByStatus,
  deriveQuestionAttentionItems,
  deriveQuestionStatus,
  deriveVisibilityDistribution,
  filterQuestionsByStatus,
  QUESTION_STATUS_ORDER,
  type QuestionAttentionItem,
  type QuestionStatus,
} from "@/features/reports/prompts";
import { countryCodeToFlagUrl } from "@/lib/flag";
import { useAudienceCounts } from "@/features/reports/hooks/useAudienceCounts";
import { useDiscoverySummary } from "@/features/reports/hooks/useDiscoverySummary";
import { useMarketCounts } from "@/features/reports/hooks/useMarketCounts";
import { useProductCounts } from "@/features/reports/hooks/useProductCounts";
import { useTopicCounts } from "@/features/reports/hooks/useTopicCounts";
import {
  useAddWorkspacePrompt,
  useRemoveWorkspacePrompt,
  useUpdateWorkspacePrompt,
  useWorkspacePrompts,
} from "@/features/reports/hooks/useWorkspacePrompts";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";
import type {
  BrandedDimensionGroupDto,
  WorkspacePromptRowDto,
  WorkspacePromptTrackerOptionDto,
} from "@/types/api";

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

const EMPTY_GROUPS: readonly BrandedDimensionGroupDto[] = [];

type SortKey = "default" | "visibility" | "mentions" | "scans" | "lastScan";
type SortDir = "asc" | "desc";

/**
 * Workspace-wide prompt rollup at /prompts. Lens chips at the top double
 * as filter selectors AND section anchors — same model as the Workspace
 * Overview. The page is split into a status strip (summary tiles + lens
 * distribution + visibility histogram) followed by 6 lens-shaped sections,
 * each rendering the prompts in that lens.
 *
 * Filter dimensions inside the FiltersPopover: Topics / Products &
 * Services / Markets / Audiences (per-brand dropdown selectors driven
 * by useDiscoverySummary) + Models (inline platform-code chips derived
 * from the row's platformCodes) + Sentiment (inline chips keyed off
 * the row's dominantSentiment).
 *
 * Row click opens PromptAnswerHistoryDrawer — per-prompt AI answer
 * history across in-window scans, with brand-mention rollup per answer.
 *
 * Spec deltas still owed (per docs/10-navigation-and-pages-plan.md):
 *   - Per-platform Models matrix column (needs BE-side per-platform
 *     metrics on the row; today only ran/didn't-run is exposed).
 *   - Tags column (no Tag domain object exists yet).
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
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<QuestionStatus[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  // Prompt whose row-click drawer is open. null = no drawer.
  const [drawerPromptId, setDrawerPromptId] = useState<string | null>(null);
  const [reportQueued, setReportQueued] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  // Add-prompt dialog open state. We don't keep form state here — the
  // dialog component owns its own draft and resets on close.
  const [isAddOpen, setIsAddOpen] = useState(false);

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
    if (selectedSentiments.length > 0) {
      // Sentiment narrows to rows whose dominantSentiment matches one of
      // the selected values. Rows with no measured sentiment (null) are
      // excluded — they have nothing to match against.
      const sentimentSet = new Set(selectedSentiments);
      rows = rows.filter(
        (r) => r.dominantSentiment != null && sentimentSet.has(r.dominantSentiment),
      );
    }
    if (selectedStatuses.length > 0) {
      rows = filterQuestionsByStatus(rows, selectedStatuses);
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
    selectedSentiments,
    selectedStatuses,
    query,
  ]);

  // Models + Sentiment chip rows show the full canonical sets at all
  // times — predictable affordance, no chips appearing/disappearing
  // as scope or selection changes. Counts ARE shown (sourced from the
  // first non-empty prompts payload) but frozen after capture so the
  // badges don't move under the user. See WorkspaceOverviewScreen for
  // the same shape.
  const availablePlatformCodes = useMemo<readonly string[]>(() => Object.keys(PLATFORM_LABELS), []);
  const availableSentiments = SENTIMENT_ORDER;
  const [promptCountsByPlatformCode, setPromptCountsByPlatformCode] = useState<Record<
    string,
    number
  > | null>(null);
  const [promptCountsBySentiment, setPromptCountsBySentiment] = useState<Record<
    string,
    number
  > | null>(null);
  const statusCounts = useMemo(
    () => countQuestionsByStatus(prompts.data?.prompts ?? []),
    [prompts.data],
  );
  const attentionItems = useMemo(
    () => deriveQuestionAttentionItems(filteredPrompts),
    [filteredPrompts],
  );
  useEffect(() => {
    if (promptCountsByPlatformCode !== null || !prompts.data) return;
    if (prompts.data.prompts.length === 0) return;
    // Pre-fill every canonical code with 0 so chips that the
    // workspace doesn't have data on still render a "0" badge.
    const snapshot: Record<string, number> = {};
    for (const code of Object.keys(PLATFORM_LABELS)) snapshot[code] = 0;
    for (const p of prompts.data.prompts) {
      for (const c of p.platformCodes) snapshot[c] = (snapshot[c] ?? 0) + 1;
    }
    setPromptCountsByPlatformCode(snapshot);
  }, [prompts.data, promptCountsByPlatformCode]);
  useEffect(() => {
    if (promptCountsBySentiment !== null || !prompts.data) return;
    if (prompts.data.prompts.length === 0) return;
    const snapshot: Record<string, number> = {};
    for (const value of SENTIMENT_ORDER) snapshot[value] = 0;
    for (const p of prompts.data.prompts) {
      if (p.dominantSentiment != null) {
        snapshot[p.dominantSentiment] = (snapshot[p.dominantSentiment] ?? 0) + 1;
      }
    }
    setPromptCountsBySentiment(snapshot);
  }, [prompts.data, promptCountsBySentiment]);

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
  const promptData = prompts.data;

  // Build sections only for selected lenses. A lens with NO in-scope
  // prompts at all is dropped (no header, no empty state — the lens
  // just has nothing here yet). A lens that DOES have prompts in scope
  // but whose rows are all hidden by active filters keeps its header
  // visible with a friendly empty-state message — the user needs to
  // see WHY a familiar section disappeared, not have it vanish.
  const sections: MetricCategorySection[] = [];
  for (const code of ALL_LENS_CODES) {
    if (!selectedLenses.includes(code)) continue;
    const lens = VISIBILITY_LENSES.find((l) => l.code === code);
    if (!lens) continue;
    const unfilteredCount = promptCountsByLensCode[code] ?? 0;
    if (unfilteredCount === 0) continue;
    const rowsForLens = filteredPrompts.filter((r) => LENS_NAME_TO_CODE[r.lensName] === code);
    const sortedRows = sortPrompts(rowsForLens, sortBy, sortDir);
    sections.push({
      id: code,
      label: lens.name,
      children:
        sortedRows.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-3 text-xs text-neutral-500">
            No AI questions in {lens.name} match the current filters.
          </p>
        ) : (
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
            onOpenAnswerHistory={setDrawerPromptId}
          />
        ),
    });
  }

  const activeFilterCount =
    (selectedTopicNames.length > 0 ? 1 : 0) +
    (selectedProductNames.length > 0 ? 1 : 0) +
    (selectedMarketNames.length > 0 ? 1 : 0) +
    (selectedAudienceNames.length > 0 ? 1 : 0) +
    (selectedPlatformCodes.length > 0 ? 1 : 0) +
    (selectedSentiments.length > 0 ? 1 : 0) +
    (selectedStatuses.length > 0 ? 1 : 0);

  const controlsStrip = (
    <div className="flex flex-nowrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <div className="min-w-0 flex-1 overflow-x-auto">
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
      </div>
      <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
        <Input
          inputSize="sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search AI questions…"
          aria-label="Filter AI questions"
          className="w-48"
        />
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
            setSelectedStatuses([]);
          }}
        >
          {/* Trigger-pill selectors live in one flex-wrap group — each
              pill already carries the dimension name ("12 topics", "5
              markets", etc.), so a per-row label + divider would only
              repeat the same information. Models and Sentiment below
              keep their own rows because their chips show individual
              values without the dimension name. */}
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
              available={availablePlatformCodes}
              selected={selectedPlatformCodes}
              onChange={setSelectedPlatformCodes}
              labelFor={platformLabel}
              emptyLabel="No models in scope."
              countsByValue={promptCountsByPlatformCode ?? undefined}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Sentiment" active={selectedSentiments.length > 0}>
            <InlineChipFilter
              available={availableSentiments}
              selected={selectedSentiments}
              onChange={setSelectedSentiments}
              emptyLabel="No sentiments in scope."
              countsByValue={promptCountsBySentiment ?? undefined}
            />
          </FiltersPopoverRow>
          <FiltersPopoverRow label="Status" active={selectedStatuses.length > 0}>
            <InlineChipFilter
              available={QUESTION_STATUS_ORDER}
              selected={selectedStatuses}
              onChange={(next) => setSelectedStatuses(next as QuestionStatus[])}
              emptyLabel="No statuses in scope."
              countsByValue={statusCounts}
            />
          </FiltersPopoverRow>
        </FiltersPopover>
      </div>
    </div>
  );

  const trackerOptions = prompts.data.trackers;
  const totalAllocation = prompts.data.totalAllocation;
  const totalUsed = prompts.data.totalUsed;
  const hasAllocationData = trackerOptions.length > 0 && totalAllocation > 0;
  const atOrOverQuota = hasAllocationData && totalUsed >= totalAllocation;
  const promptActionCopy = REPORTS_COPY.prompts.workspace.actions;
  const filteredPromptCount = filteredPrompts.length.toLocaleString();

  function addFilteredQuestionsToReport() {
    setReportQueued(true);
    setReportNotice(promptActionCopy.reportNotice.replace("{count}", filteredPromptCount));
  }

  function exportFilteredQuestionsPackage() {
    exportPromptReportPackage(filteredPrompts, {
      dateRange: range,
      totalInScope: promptData.prompts.length,
      selectedLenses,
      selectedTopicNames,
      selectedProductNames,
      selectedMarketNames,
      selectedAudienceNames,
      selectedPlatformCodes,
      selectedSentiments,
      selectedStatuses,
      query,
      sortBy,
      sortDir,
    });
    setReportNotice(promptActionCopy.exportNotice.replace("{count}", filteredPromptCount));
  }

  return (
    <div className="space-y-5">
      <PageHeader title="AI Questions">
        {/* "X / Y prompts" quota indicator across in-scope trackers.
            Hidden when the workspace has no allocation data (avoids
            displaying a stark "0 / 0" before any tracker is set up).
            Tints to a warning colour once the workspace is at or past
            its aggregate allocation so the limit is legible at a glance. */}
        {hasAllocationData && (
          <div
            aria-label="AI question allocation across in-scope trackers"
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums",
              atOrOverQuota
                ? "border-semantic-warning-200 bg-semantic-warning-50 text-semantic-warning-700"
                : "border-neutral-200 bg-white text-neutral-700",
            )}
          >
            <span className="text-neutral-500">AI Questions</span>
            <span>{totalUsed.toLocaleString()}</span>
            <span className="text-neutral-400">/</span>
            <span>{totalAllocation.toLocaleString()}</span>
          </div>
        )}
        {/* Compact "Add prompt" button — text label leads, "+" reads as
            a glyph rather than the whole affordance. Pairs with the
            quota badge so the header carries the workspace-wide
            "what / how much / add" cluster. */}
        <Button
          variant="outline"
          size="sm"
          disabled={reportQueued}
          onClick={addFilteredQuestionsToReport}
        >
          <FilePlus className="h-3.5 w-3.5" aria-hidden />
          {reportQueued ? promptActionCopy.addedToReport : promptActionCopy.addToReport}
        </Button>
        <Button variant="outline" size="sm" onClick={exportFilteredQuestionsPackage}>
          <Download className="h-3.5 w-3.5" aria-hidden />
          {promptActionCopy.exportPackage}
        </Button>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          disabled={trackerOptions.length === 0}
          aria-label="Add AI question"
          title="Add AI question"
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700 transition hover:bg-primary-100",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-50",
          )}
        >
          <Plus className="h-3 w-3" aria-hidden />
          <span>Add AI question</span>
        </button>
      </PageHeader>

      {reportNotice && (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-800">
          {reportNotice}
        </div>
      )}

      {prompts.data.prompts.length === 0 ? (
        <>
          {controlsStrip}
          <Card>
            <CardContent className="p-8 text-center text-sm text-neutral-600">
              No active AI questions in scope yet. Trackers populate this page once their AI
              questions are confirmed.
            </CardContent>
          </Card>
        </>
      ) : (
        <MetricCategoryLayout
          statusStrip={
            <div className="space-y-3">
              <TopSection
                prompts={filteredPrompts}
                totalCount={prompts.data.prompts.length}
                promptCountsByLensCode={promptCountsByLensCode}
              />
              <QuestionAttentionSection
                items={attentionItems}
                onOpenAnswerHistory={setDrawerPromptId}
              />
            </div>
          }
          controlsStrip={controlsStrip}
          sections={sections}
          renderNav={() => null}
        />
      )}
      <PromptAnswerHistoryDrawer
        promptId={drawerPromptId}
        range={range}
        onClose={() => setDrawerPromptId(null)}
      />
      <AddPromptDialog open={isAddOpen} onOpenChange={setIsAddOpen} trackers={trackerOptions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-prompt dialog — picks tracker → lens → text. Owns its own draft
// state and resets on close so re-opening doesn't carry stale input.
// ---------------------------------------------------------------------------

interface PromptReportPackageOptions {
  dateRange: DateRangeSelection;
  totalInScope: number;
  selectedLenses: readonly string[];
  selectedTopicNames: readonly string[];
  selectedProductNames: readonly string[];
  selectedMarketNames: readonly string[];
  selectedAudienceNames: readonly string[];
  selectedPlatformCodes: readonly string[];
  selectedSentiments: readonly string[];
  selectedStatuses: readonly QuestionStatus[];
  query: string;
  sortBy: SortKey;
  sortDir: SortDir;
}

function exportPromptReportPackage(
  rows: readonly WorkspacePromptRowDto[],
  options: PromptReportPackageOptions,
) {
  const payload = {
    packageType: "ai-questions-report",
    createdAt: new Date().toISOString(),
    dateRange: options.dateRange,
    totalInScope: options.totalInScope,
    filteredCount: rows.length,
    filters: {
      lenses: options.selectedLenses,
      topics: options.selectedTopicNames,
      products: options.selectedProductNames,
      markets: options.selectedMarketNames,
      audiences: options.selectedAudienceNames,
      platforms: options.selectedPlatformCodes,
      sentiments: options.selectedSentiments,
      statuses: options.selectedStatuses,
      query: options.query,
      sortBy: options.sortBy,
      sortDir: options.sortDir,
    },
    summary: deriveSummary(rows),
    attentionItems: deriveQuestionAttentionItems(rows),
    prompts: rows.map((row) => ({
      promptId: row.promptId,
      text: row.text,
      lensName: row.lensName,
      brandName: row.brandName,
      trackerName: row.trackerName,
      topics: row.topics,
      products: row.products,
      markets: row.markets,
      audiences: row.audiences,
      platformCodes: row.platformCodes,
      visibilityRate: row.visibilityRate,
      brandMentionCount: row.brandMentionCount,
      dominantSentiment: row.dominantSentiment,
      averageFirstMentionPosition: row.averageFirstMentionPosition,
      scanCount: row.scanCount,
      lastScanAt: row.lastScanAt,
      status: deriveQuestionStatus(row),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ai-questions-report-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function QuestionAttentionSection({
  items,
  onOpenAnswerHistory,
}: {
  items: readonly QuestionAttentionItem[];
  onOpenAnswerHistory: (promptId: string) => void;
}) {
  const copy = REPORTS_COPY.prompts.workspace.attention;
  return (
    <section aria-labelledby="question-attention-title">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="question-attention-title" className="text-sm font-semibold text-neutral-900">
                {copy.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">{copy.description}</p>
            </div>
            <Badge variant={items.length === 0 ? "success" : "warning"}>
              {items.length.toLocaleString()}
            </Badge>
          </div>
          {items.length === 0 ? (
            <p className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              {copy.empty}
            </p>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.promptId}
                  className="flex min-h-36 flex-col rounded-md border border-neutral-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-semibold text-neutral-900">
                        {item.text}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-500">{item.reason}</p>
                    </div>
                    <Badge variant={item.priority === "High" ? "destructive" : "warning"}>
                      {copy.priority}: {item.priority}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.lensName}</Badge>
                    <Badge variant="secondary">{item.status}</Badge>
                    <Badge variant="outline">{item.action}</Badge>
                  </div>
                  <div className="mt-auto flex justify-end pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenAnswerHistory(item.promptId)}
                    >
                      {copy.openHistory}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

interface AddPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackers: readonly WorkspacePromptTrackerOptionDto[];
}

function AddPromptDialog({ open, onOpenChange, trackers }: AddPromptDialogProps) {
  const [trackerId, setTrackerId] = useState<string>("");
  const [lensId, setLensId] = useState<string>("");
  const [text, setText] = useState("");
  const add = useAddWorkspacePrompt();

  const selectedTracker = trackers.find((t) => t.id === trackerId);
  const lenses = selectedTracker?.lenses ?? [];
  const atTrackerCap =
    selectedTracker != null && selectedTracker.promptUsed >= selectedTracker.promptAllocation;

  // Reset every field when the dialog closes so re-opening starts blank.
  useEffect(() => {
    if (!open) {
      setTrackerId("");
      setLensId("");
      setText("");
    }
  }, [open]);

  // Clear the lens choice whenever the tracker changes — the previous
  // lens may not exist on the new tracker, and a stale lens would
  // produce a silent BE rejection.
  useEffect(() => {
    setLensId("");
  }, [trackerId]);

  const submitDisabled =
    add.isPending || atTrackerCap || trackerId === "" || lensId === "" || text.trim().length === 0;

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || !trackerId || !lensId) return;
    add.mutate(
      { trackerId, text: trimmed, lensId },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  const errorMessage =
    add.isError && add.error instanceof Error
      ? add.error.message
      : add.isError
        ? "Add failed — try again."
        : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-neutral-200 bg-white p-5 shadow-xl focus:outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-base font-semibold text-neutral-900">
                Add AI question
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-neutral-600">
                Pick a tracker and lens, then write the AI question text. It joins the tracker's
                active questions immediately.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="add-prompt-tracker" className="text-[11px] text-neutral-600">
                Tracker
              </Label>
              <Select value={trackerId} onValueChange={setTrackerId}>
                <SelectTrigger
                  id="add-prompt-tracker"
                  selectSize="sm"
                  aria-label="Tracker"
                  className="w-full"
                >
                  <SelectValue placeholder="Select tracker…" />
                </SelectTrigger>
                <SelectContent>
                  {trackers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.brandName} · {t.name} ({t.promptUsed}/{t.promptAllocation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {atTrackerCap && (
                <p className="text-[11px] text-semantic-warning-700">
                  {selectedTracker?.name} is at allocation ({selectedTracker?.promptAllocation}).
                  Remove an AI question before adding another.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-prompt-lens" className="text-[11px] text-neutral-600">
                Lens
              </Label>
              <Select value={lensId} onValueChange={setLensId} disabled={lenses.length === 0}>
                <SelectTrigger
                  id="add-prompt-lens"
                  selectSize="sm"
                  aria-label="Lens"
                  className="w-full"
                >
                  <SelectValue
                    placeholder={
                      trackerId === ""
                        ? "Pick a tracker first"
                        : lenses.length === 0
                          ? "No lenses configured"
                          : "Select lens…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {lenses.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-prompt-text" className="text-[11px] text-neutral-600">
                AI question text
              </Label>
              <textarea
                id="add-prompt-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="What's the best resume builder?"
                aria-label="AI question text"
                disabled={add.isPending}
                className="w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
              />
            </div>

            {errorMessage && (
              <p role="alert" className="text-[11px] text-semantic-error-600">
                {errorMessage}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm" disabled={add.isPending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="button" size="sm" onClick={submit} disabled={submitDisabled}>
              {add.isPending ? "Adding…" : "Add AI question"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
  const lensSummaries = useMemo(() => deriveLensSummaries(prompts), [prompts]);

  const donutSlices: DonutChartDatum[] = useMemo(() => {
    return VISIBILITY_LENSES.map((lens, i) => ({
      id: lens.code,
      label: lens.name,
      value: promptCountsByLensCode[lens.code] ?? 0,
      color: LENS_PALETTE[i % LENS_PALETTE.length],
    })).filter((s) => s.value > 0);
  }, [promptCountsByLensCode]);

  const histogramData: BarChartDatum[] = useMemo(() => {
    return deriveVisibilityDistribution(prompts);
  }, [prompts]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="AI questions in view"
          value={prompts.length.toLocaleString()}
          sub={`of ${totalCount.toLocaleString()}`}
          tooltip="In-scope AI questions after lens, topic, model, and search filters — out of the workspace total."
        />
        <SummaryTile
          label="% with mentions"
          value={
            summary.withMentionsPct == null ? "—" : `${Math.round(summary.withMentionsPct * 100)}%`
          }
          sub={`${summary.withMentionsCount.toLocaleString()} AI questions`}
          tooltip="Share of in-view AI questions whose tracked brand was mentioned at least once in this window."
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
          tooltip="Mean per-question visibility rate across in-view AI questions that produced at least one in-window answer."
        />
        <SummaryTile
          label="Avg mentions / question"
          value={summary.avgMentions == null ? "—" : summary.avgMentions.toFixed(1)}
          sub={
            summary.totalMentions === 0
              ? "no data"
              : `${summary.totalMentions.toLocaleString()} total`
          }
          tooltip="Mean tracked-brand mention count per in-view AI question during the selected window."
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <CollapsibleCard
          icon={PieChart}
          title="AI questions by lens"
          tooltip="How in-view AI questions split across the six Visibility Lenses, with mention rate, average position, and weak or missing visibility counts."
        >
          {donutSlices.length === 0 ? (
            <p className="text-sm text-neutral-500">No AI questions in scope.</p>
          ) : (
            <div className="space-y-3">
              <DonutChartWrapper
                data={donutSlices}
                formatValue={(v) => `${v} AI question${v === 1 ? "" : "s"}`}
                height={180}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left uppercase tracking-wide text-neutral-500">
                    <tr>
                      <Th>Lens</Th>
                      <Th className="text-right">Questions</Th>
                      <Th className="text-right">Mention rate</Th>
                      <Th className="text-right">Avg position</Th>
                      <Th className="text-right">Open issues</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {lensSummaries.map((lens) => (
                      <tr key={lens.code}>
                        <Td>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: lens.color }}
                              aria-hidden
                            />
                            <span className="font-medium text-neutral-900">{lens.name}</span>
                          </div>
                        </Td>
                        <Td className="text-right tabular-nums">{lens.questionCount}</Td>
                        <Td className="text-right tabular-nums">
                          {Math.round(lens.mentionRate * 100)}%
                        </Td>
                        <Td className="text-right tabular-nums">
                          {lens.avgPosition == null ? "—" : lens.avgPosition.toFixed(1)}
                        </Td>
                        <Td className="text-right tabular-nums">
                          {lens.openIssues === 0 ? (
                            <span className="text-neutral-400">—</span>
                          ) : (
                            <span className="font-medium text-semantic-warning-700">
                              {lens.openIssues}
                            </span>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CollapsibleCard>
        <CollapsibleCard
          icon={BarChart3}
          title="Visibility distribution"
          tooltip="In-view AI questions grouped as not visible, weak, moderate, strong, or dominant based on brand visibility rate. Counts only questions with at least one in-window answer."
        >
          {prompts.length === 0 ? (
            <p className="text-sm text-neutral-500">No AI questions in scope.</p>
          ) : (
            <BarChartWrapper data={histogramData} valueAxisLabel="AI Questions" height={220} />
          )}
        </CollapsibleCard>
      </div>
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
  /** Optional explanatory copy for the info affordance. */
  tooltip?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-neutral-500">
          <span className="truncate">{label}</span>
          {tooltip ? <InfoTooltip label={label} body={tooltip} iconSize={12} /> : null}
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

interface LensSummary {
  code: string;
  name: string;
  color: string;
  questionCount: number;
  mentionRate: number;
  avgPosition: number | null;
  openIssues: number;
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

function deriveLensSummaries(prompts: readonly WorkspacePromptRowDto[]): LensSummary[] {
  return VISIBILITY_LENSES.map((lens, index) => {
    const rows = prompts.filter((prompt) => LENS_NAME_TO_CODE[prompt.lensName] === lens.code);
    if (rows.length === 0) return null;

    const rowsWithMentions = rows.filter((prompt) => prompt.brandMentionCount > 0).length;
    const rowsWithPosition = rows.filter(
      (prompt): prompt is WorkspacePromptRowDto & { averageFirstMentionPosition: number } =>
        prompt.averageFirstMentionPosition != null,
    );
    const positionTotal = rowsWithPosition.reduce(
      (sum, prompt) => sum + prompt.averageFirstMentionPosition,
      0,
    );
    const openIssues = rows.filter(
      (prompt) => prompt.visibilityRate == null || prompt.visibilityRate < 0.25,
    ).length;

    return {
      code: lens.code,
      name: lens.name,
      color: LENS_PALETTE[index % LENS_PALETTE.length],
      questionCount: rows.length,
      mentionRate: rowsWithMentions / rows.length,
      avgPosition: rowsWithPosition.length === 0 ? null : positionTotal / rowsWithPosition.length,
      openIssues,
    };
  }).filter((lens): lens is LensSummary => lens != null);
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
  /** Open the answer-history drawer for the given prompt. Fired on row click. */
  onOpenAnswerHistory: (promptId: string) => void;
}

function PromptsTable({
  rows,
  sortBy,
  sortDir,
  onSortChange,
  onOpenAnswerHistory,
}: PromptsTableProps) {
  const update = useUpdateWorkspacePrompt();
  const remove = useRemoveWorkspacePrompt();
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          <tr>
            <Th>AI Question</Th>
            <Th>Topics</Th>
            <Th>Audience</Th>
            <Th>Market</Th>
            <Th>Country</Th>
            <Th>Tracker</Th>
            <Th>Platforms</Th>
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
            <Th>Status</Th>
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
              onOpen={() => onOpenAnswerHistory(row.promptId)}
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
  onOpen,
}: {
  row: WorkspacePromptRowDto;
  onEdit: (text: string) => void;
  onRemove: () => void;
  isRemoving: boolean;
  /** Open the row's answer-history drawer. Fired on row click. */
  onOpen: () => void;
}) {
  return (
    <tr
      onClick={onOpen}
      aria-haspopup="dialog"
      className="cursor-pointer transition hover:bg-neutral-50"
    >
      {/* The prompt cell hosts an InlineEdit button. Clicking it opens
          the editor — NOT the drawer — so we eat the click here. */}
      <Td onClick={(e) => e.stopPropagation()}>
        <InlineEdit
          value={row.text}
          onChange={(next) => {
            if (next.trim().length > 0 && next !== row.text) {
              onEdit(next);
            }
          }}
          multiline
          placeholder="AI question text"
        />
      </Td>
      <Td>
        <DimensionChipList values={row.topics} emptyLabel="No topics" />
      </Td>
      <Td>
        <DimensionChipList values={row.audiences} emptyLabel="No audience" />
      </Td>
      <Td>
        <DimensionChipList values={row.markets} emptyLabel="No market" />
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
      <Td>
        <PlatformCell platformCodes={row.platformCodes} />
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
          </span>
        </div>
      </Td>
      <Td>
        <QuestionStatusBadge row={row} />
      </Td>
      <Td className="w-6" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove AI question ${row.text}`}
          className="rounded-sm p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-50"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      </Td>
    </tr>
  );
}

function QuestionStatusBadge({ row }: { row: WorkspacePromptRowDto }) {
  const status = deriveQuestionStatus(row);

  if (status === "No answers") {
    return (
      <Badge variant="outline" className="whitespace-nowrap text-[10px]">
        {status}
      </Badge>
    );
  }

  if (status === "Needs attention") {
    return (
      <Badge variant="warning" className="whitespace-nowrap text-[10px]">
        {status}
      </Badge>
    );
  }

  if (status === "Not visible") {
    return (
      <Badge variant="secondary" className="whitespace-nowrap text-[10px]">
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="whitespace-nowrap text-[10px]">
      {status}
    </Badge>
  );
}

function DimensionChipList({
  values,
  emptyLabel,
}: {
  values: readonly string[];
  emptyLabel: string;
}) {
  if (values.length === 0) return <span className="text-neutral-400">{emptyLabel}</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {values.slice(0, 3).map((value) => (
        <Badge key={value} variant="outline" className="text-[10px]">
          {value}
        </Badge>
      ))}
      {values.length > 3 && (
        <span className="text-[10px] text-neutral-400">+{values.length - 3}</span>
      )}
    </div>
  );
}

function PlatformCell({ platformCodes }: { platformCodes: readonly string[] }) {
  if (platformCodes.length === 0) return <span className="text-neutral-400">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {platformCodes.slice(0, 3).map((code) => (
        <Badge key={code} variant="secondary" className="text-[10px]">
          {platformLabel(code)}
        </Badge>
      ))}
      {platformCodes.length > 3 && (
        <span className="text-[10px] text-neutral-400">+{platformCodes.length - 3}</span>
      )}
    </div>
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

function Td({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLTableCellElement>;
}) {
  return (
    <td onClick={onClick} className={cn("px-3 py-2 align-top text-neutral-700", className)}>
      {children}
    </td>
  );
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
