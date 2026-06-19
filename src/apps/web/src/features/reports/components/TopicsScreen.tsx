import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, FileText, Tags, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { Progress } from "@/components/atoms/progress";
import { DataTable } from "@/components/molecules/DataTable";
import {
  DateRangePicker,
  defaultDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import {
  countTopicsByAction,
  countTopicsByBand,
  deriveContentOpportunityTopics,
  deriveTopicRecommendationPreview,
  deriveTopicOpportunities,
  filterTopicOpportunities,
  type TopicAction,
  type TopicOpportunityRow,
  type TopicOwnershipBand,
} from "@/features/reports/topics";

export function TopicsScreen() {
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [bandFilter, setBandFilter] = useState<TopicOwnershipBand | null>(null);
  const [actionFilter, setActionFilter] = useState<TopicAction | null>(null);
  const [selected, setSelected] = useState<TopicOpportunityRow | null>(null);

  const overview = useWorkspaceOverview(range, [], [], [], [], [], trackerIds);
  const rows = useMemo(() => deriveTopicOpportunities(overview.data), [overview.data]);
  const filteredRows = useMemo(
    () => filterTopicOpportunities(rows, bandFilter, actionFilter),
    [actionFilter, bandFilter, rows],
  );
  const contentOpportunities = useMemo(
    () => deriveContentOpportunityTopics(filteredRows),
    [filteredRows],
  );
  const bandCounts = useMemo(() => countTopicsByBand(rows), [rows]);
  const actionCounts = useMemo(() => countTopicsByAction(rows), [rows]);

  const columns = useMemo<ColumnDef<TopicOpportunityRow, unknown>[]>(
    () => [
      {
        accessorKey: "rank",
        header: "Priority",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums text-neutral-900">#{row.original.rank}</span>
        ),
        meta: { cellClassName: "w-24" },
      },
      {
        accessorKey: "topicName",
        header: "Topic",
        cell: ({ row }) => (
          <button type="button" onClick={() => setSelected(row.original)} className="text-left">
            <span className="font-medium text-neutral-900 hover:text-primary-700">
              {row.original.topicName}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">
              {topicSummary(row.original)}
            </span>
          </button>
        ),
        meta: { cellClassName: "min-w-72" },
      },
      {
        accessorKey: "band",
        header: "Ownership",
        cell: ({ row }) => <OwnershipBadge band={row.original.band} />,
      },
      {
        accessorKey: "ownershipRate",
        header: "Mention coverage",
        cell: ({ row }) => (
          <div className="min-w-36 space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium tabular-nums text-neutral-900">
                {formatRate(row.original.ownershipRate)}
              </span>
              <span className="text-neutral-500">
                {row.original.brandMentionedPromptCount}/{row.original.promptCount}
              </span>
            </div>
            <Progress value={row.original.ownershipRate * 100} progressSize="sm" />
          </div>
        ),
        meta: { className: "min-w-44" },
      },
      {
        accessorKey: "promptCount",
        header: "AI Questions",
        meta: { align: "right" },
      },
      {
        accessorKey: "missedPromptCount",
        header: "Gaps",
        meta: { align: "right" },
      },
      {
        accessorKey: "action",
        header: "Recommended action",
        cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
      },
      {
        id: "open",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Open topic</span>
          </Button>
        ),
        meta: { align: "right", cellClassName: "w-16" },
      },
    ],
    [],
  );

  if (overview.isLoading) return <LoadingPage />;
  if (overview.isError) {
    return (
      <ErrorPage
        error={overview.error instanceof Error ? overview.error : undefined}
        onReset={() => void overview.refetch()}
      />
    );
  }
  if (!overview.data) return null;

  const ownedCount = filteredRows.filter((row) => row.band === "Owned").length;
  const weakCount = filteredRows.filter((row) => row.band !== "Owned").length;
  const opportunityCount = filteredRows.filter((row) => row.action !== "Defend").length;
  const promptCount = filteredRows.reduce((sum, row) => sum + row.promptCount, 0);
  const hasActiveFilters = bandFilter != null || actionFilter != null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Topics"
        description="Review topic visibility, weak areas, and content opportunities from Brand Discovery."
      >
        <Button variant="outline" size="sm" disabled>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Export brief
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <DateRangePicker value={range} onChange={setRange} />
        <BandFilterPills
          counts={bandCounts}
          selected={bandFilter}
          onSelect={(band) => setBandFilter((current) => (current === band ? null : band))}
        />
        <ActionFilterPills
          counts={actionCounts}
          selected={actionFilter}
          onSelect={(action) => setActionFilter((current) => (current === action ? null : action))}
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setBandFilter(null);
              setActionFilter(null);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="Topics tracked"
          value={filteredRows.length.toLocaleString()}
          helper="Topics with tracked AI questions in the selected scope."
        />
        <SummaryTile
          label="Strong topics"
          value={ownedCount.toLocaleString()}
          helper="Topics where tracked brands appear in most AI answers."
        />
        <SummaryTile
          label="Weak topics"
          value={weakCount.toLocaleString()}
          helper="Topics with contested or missing brand visibility."
        />
        <SummaryTile
          label="Content opportunities"
          value={opportunityCount.toLocaleString()}
          helper={`${promptCount.toLocaleString()} tracked AI questions evaluated.`}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        getRowId={(row) => row.id}
        initialSorting={[{ id: "rank", desc: false }]}
        emptyMessage={hasActiveFilters ? <FilteredTopicsEmptyState /> : <TopicsEmptyState />}
      />

      {contentOpportunities.length > 0 && (
        <ContentOpportunitiesSection items={contentOpportunities} onOpen={setSelected} />
      )}

      <TopicDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ContentOpportunitiesSection({
  items,
  onOpen,
}: {
  items: readonly TopicOpportunityRow[];
  onOpen: (item: TopicOpportunityRow) => void;
}) {
  const copy = REPORTS_COPY.topics.workspace.opportunities;

  return (
    <section aria-labelledby="topic-content-opportunities-title">
      <Card>
        <CardContent className="p-5">
          <div>
            <h2
              id="topic-content-opportunities-title"
              className="text-sm font-semibold text-neutral-900"
            >
              {copy.title}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">{copy.description}</p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex min-h-40 flex-col rounded-md border border-neutral-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">{item.topicName}</h3>
                    <p className="mt-1 text-xs text-neutral-500">{topicSummary(item)}</p>
                  </div>
                  <OwnershipBadge band={item.band} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.action}</Badge>
                  <span className="text-xs text-neutral-500">
                    {formatMissedQuestions(item.missedPromptCount)}
                  </span>
                </div>
                <div className="mt-auto flex justify-end gap-2 pt-4">
                  <Button variant="ghost" size="sm" onClick={() => onOpen(item)}>
                    {copy.createRecommendation}
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    {copy.generateBrief}
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

function SummaryTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
        <p className="mt-1 text-xs text-neutral-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function OwnershipBadge({ band }: { band: TopicOwnershipBand }) {
  const variant = band === "Owned" ? "success" : band === "Contested" ? "warning" : "destructive";
  return <Badge variant={variant}>{band}</Badge>;
}

function BandFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<TopicOwnershipBand, number>;
  selected: TopicOwnershipBand | null;
  onSelect: (band: TopicOwnershipBand) => void;
}) {
  const bands: readonly TopicOwnershipBand[] = ["Gap", "Contested", "Owned"];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {bands.map((band) => (
        <FilterPill
          key={band}
          label={band}
          count={counts[band]}
          selected={selected === band}
          onClick={() => onSelect(band)}
        />
      ))}
    </div>
  );
}

function ActionFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<TopicAction, number>;
  selected: TopicAction | null;
  onSelect: (action: TopicAction) => void;
}) {
  const actions: readonly TopicAction[] = ["Create coverage", "Build authority", "Defend"];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {actions.map((action) => (
        <FilterPill
          key={action}
          label={action}
          count={counts[action]}
          selected={selected === action}
          onClick={() => onSelect(action)}
        />
      ))}
    </div>
  );
}

function FilterPill({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
        selected
          ? "border-primary-600 bg-primary-100 text-primary-700"
          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums text-neutral-400">{count}</span>
    </button>
  );
}

function TopicsEmptyState() {
  return (
    <div className="p-5 text-center">
      <Tags className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold text-neutral-900">No topics yet</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm text-neutral-500">
        Topics appear after Brand Discovery and scans have enough tracked AI questions for the
        selected tracker and date range.
      </p>
    </div>
  );
}

function FilteredTopicsEmptyState() {
  return (
    <div className="p-5 text-center">
      <Tags className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold text-neutral-900">No topics match these filters</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm text-neutral-500">
        Clear the ownership or action filter to return to the full topic opportunity list.
      </p>
    </div>
  );
}

function TopicDrawer({ item, onClose }: { item: TopicOpportunityRow | null; onClose: () => void }) {
  if (!item) return null;

  const copy = REPORTS_COPY.topics.workspace.drawer;
  const recommendation = deriveTopicRecommendationPreview(item);

  return (
    <div className="fixed inset-0 z-50 bg-black/20" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-drawer-title"
        className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-neutral-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {copy.eyebrow}
            </p>
            <h2 id="topic-drawer-title" className="mt-1 text-lg font-semibold">
              {item.topicName}
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
            <DrawerMeta label={copy.ownership} value={item.band} />
            <DrawerMeta label={copy.coverage} value={formatRate(item.ownershipRate)} />
            <DrawerMeta label={copy.trackedQuestions} value={item.promptCount.toLocaleString()} />
            <DrawerMeta label={copy.coverageGaps} value={item.missedPromptCount.toLocaleString()} />
          </div>

          <DrawerSection title={copy.recommendedAction}>{actionCopy(item)}</DrawerSection>
          <DrawerSection title={copy.whyItMatters}>{topicSummary(item)}</DrawerSection>

          <div className="rounded-md border border-primary-200 bg-primary-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  {copy.recommendationPreview}
                </h3>
                <p className="mt-1 text-sm font-medium text-primary-800">{recommendation.title}</p>
              </div>
              <Badge variant="outline">
                {copy.priority}: {recommendation.priority}
              </Badge>
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-neutral-700">
              {recommendation.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{copy.evidence}</h3>
            <ul className="mt-2 space-y-2">
              {item.evidence.map((evidence) => (
                <li
                  key={evidence}
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
                >
                  {evidence}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-4">
          <Button variant="outline" size="sm" disabled>
            {copy.addToReport}
          </Button>
          <Button size="sm" disabled>
            {copy.createContentBrief}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{children}</p>
    </section>
  );
}

function DrawerMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-neutral-900">{value}</p>
    </div>
  );
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMissedQuestions(count: number) {
  const copy = REPORTS_COPY.topics.workspace.opportunities;
  return count === 1
    ? copy.missedQuestionsOne
    : copy.missedQuestions.replace("{count}", count.toLocaleString());
}

function topicSummary(row: TopicOpportunityRow) {
  return `${row.brandMentionedPromptCount.toLocaleString()} of ${row.promptCount.toLocaleString()} tracked AI questions mentioned a tracked brand.`;
}

function actionCopy(row: TopicOpportunityRow) {
  switch (row.action) {
    case "Defend":
      return "Maintain current topic coverage and keep authoritative proof points fresh.";
    case "Build authority":
      return "Strengthen topic pages, answer common buyer questions, and improve source evidence.";
    case "Create coverage":
      return "Create or update content that directly answers this topic and cites concrete proof points.";
  }
}
