import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, FileText, ScanSearch } from "lucide-react";
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
import { LENSES_COPY, VISIBILITY_LENSES, type VisibilityLens } from "@/content/lenses";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import {
  countLensEntitiesBySentiment,
  countLensEntitiesByType,
  deriveLensDiagnosis,
  filterLensEntities,
  type EntitySentimentFilter,
  type LensDiagnosis,
} from "@/features/reports/lenses";
import type { WorkspaceOverviewDto, WorkspaceTopEntityRowDto } from "@/types/api";

const LENS_SLUGS: Record<string, string> = {
  Discovery: "discovery",
  BuyingIntent: "buying-intent",
  CompetitorComparison: "competitive",
  SentimentAndTrust: "sentiment",
  CitationVisibility: "citations",
  ContentGaps: "content-gaps",
};

const LENS_BY_SLUG = Object.fromEntries(
  VISIBILITY_LENSES.map((lens) => [LENS_SLUGS[lens.code] ?? lens.code, lens]),
) as Record<string, VisibilityLens | undefined>;

interface LensDetailScreenProps {
  lensId: string;
}

interface LensReportItem {
  kind: "lens-diagnosis";
  createdAt: string;
  dateRange: ReturnType<typeof serializeDateRange>;
  lens: Pick<VisibilityLens, "code" | "name" | "description">;
  diagnosis: LensDiagnosis;
  summary: {
    queries: number;
    mentions: number;
    citations: number;
    brandMentionRate: number | null;
    brandAbsenceRate: number | null;
    brandFirstMentionRate: number | null;
  };
  evidence: {
    entityCount: number;
    topEntities: Array<Pick<WorkspaceTopEntityRowDto, "entityType" | "name" | "visibility">>;
  };
}

export function LensDetailScreen({ lensId }: LensDetailScreenProps) {
  const copy = LENSES_COPY.detail;
  const lens = LENS_BY_SLUG[lensId];
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<EntitySentimentFilter | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [recommendationsReady, setRecommendationsReady] = useState(false);
  const [reportItem, setReportItem] = useState<LensReportItem | null>(null);

  const overview = useWorkspaceOverview(range, lens ? [lens.code] : [], [], [], [], [], trackerIds);
  const filteredEntities = useMemo(
    () => filterLensEntities(overview.data?.topEntities ?? [], typeFilter, sentimentFilter),
    [overview.data?.topEntities, sentimentFilter, typeFilter],
  );
  const entityTypeCounts = useMemo(
    () => countLensEntitiesByType(overview.data?.topEntities ?? []),
    [overview.data?.topEntities],
  );
  const sentimentCounts = useMemo(
    () => countLensEntitiesBySentiment(overview.data?.topEntities ?? []),
    [overview.data?.topEntities],
  );
  const diagnosis = useMemo(
    () => (overview.data ? deriveLensDiagnosis(overview.data) : null),
    [overview.data],
  );

  const columns = useMemo<ColumnDef<WorkspaceTopEntityRowDto, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: copy.table.entity,
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-neutral-900">{row.original.name}</span>
            {row.original.isTrackedBrand && (
              <Badge variant="outline" className="ml-2">
                {copy.table.youChip}
              </Badge>
            )}
          </div>
        ),
        meta: { cellClassName: "min-w-56" },
      },
      {
        accessorKey: "visibility",
        header: copy.table.visibility,
        cell: ({ row }) => <RateCell value={row.original.visibility} />,
        meta: { className: "min-w-44" },
      },
      {
        accessorKey: "shareOfVoice",
        header: copy.table.shareOfVoice,
        cell: ({ row }) => <RateCell value={row.original.shareOfVoice} />,
        meta: { className: "min-w-44" },
      },
      {
        accessorKey: "sentiment",
        header: copy.table.sentiment,
        cell: ({ row }) => row.original.sentiment ?? copy.table.unknownSentiment,
      },
      {
        accessorKey: "entityType",
        header: copy.table.type,
        cell: ({ row }) => <Badge variant="secondary">{row.original.entityType}</Badge>,
      },
    ],
    [copy],
  );

  if (!lens) {
    return <ErrorPage error={new Error(copy.fallbackTitle)} />;
  }
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

  function prepareRecommendations() {
    if (!lens || !diagnosis) return;
    setRecommendationsReady(true);
    setActionNotice(copy.notice.recommendations.replace("{lens}", lens.name));
  }

  function addLensToReport() {
    if (!lens || !overview.data || !diagnosis) return;
    setReportItem(createLensReportItem(lens, overview.data, diagnosis, filteredEntities, range));
    setActionNotice(copy.notice.report.replace("{lens}", lens.name));
  }

  function exportLensBrief() {
    if (!lens || !overview.data) return;
    exportLensDetailPackage(lens, overview.data, filteredEntities, diagnosis, range);
    setActionNotice(copy.notice.exported.replace("{lens}", lens.name));
  }

  return (
    <div className="space-y-5">
      <PageHeader title={lens.name} description={lens.description}>
        <Button asChild variant="outline" size="sm">
          <Link to="/lenses">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {copy.actions.back}
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={prepareRecommendations}
          disabled={recommendationsReady}
        >
          {recommendationsReady ? copy.actions.recommendationsReady : copy.actions.recommendations}
        </Button>
        <Button variant="outline" size="sm" onClick={addLensToReport} disabled={reportItem != null}>
          {reportItem ? copy.actions.addedToReport : copy.actions.addToReport}
        </Button>
        <Button variant="outline" size="sm" onClick={exportLensBrief}>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.export}
        </Button>
      </PageHeader>

      {actionNotice && (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-800">
          {actionNotice}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <DateRangePicker value={range} onChange={setRange} />
        <EntityTypeFilterPills
          counts={entityTypeCounts}
          selected={typeFilter}
          onSelect={(type) => setTypeFilter((current) => (current === type ? null : type))}
        />
        <SentimentFilterPills
          counts={sentimentCounts}
          selected={sentimentFilter}
          onSelect={(sentiment) =>
            setSentimentFilter((current) => (current === sentiment ? null : sentiment))
          }
        />
        {(typeFilter || sentimentFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter(null);
              setSentimentFilter(null);
            }}
          >
            {copy.actions.clearFilters}
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile
          label={copy.summary.questions}
          value={overview.data.hero.queries.toLocaleString()}
          helper={copy.summary.questionsHelper}
        />
        <SummaryTile
          label={copy.summary.mentionRate}
          value={formatNullableRate(overview.data.hero.brandMentionRate)}
          helper={copy.summary.mentionRateHelper}
        />
        <SummaryTile
          label={copy.summary.firstMention}
          value={formatNullableRate(overview.data.hero.brandFirstMentionRate)}
          helper={copy.summary.firstMentionHelper}
        />
        <SummaryTile
          label={copy.summary.citations}
          value={overview.data.hero.citations.toLocaleString()}
          helper={copy.summary.citationsHelper}
        />
      </div>

      {diagnosis && <LensDiagnosisCard diagnosis={diagnosis} />}

      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-neutral-900">{copy.sections.signals}</h2>
            <p className="mt-1 text-xs text-neutral-500">{copy.sections.signalsDescription}</p>
            <div className="mt-4 space-y-3">
              <SignalRow
                label={copy.signals.absence}
                description={copy.signals.absenceDescription}
                value={overview.data.hero.brandAbsenceRate}
              />
              <SignalRow
                label={copy.signals.firstMention}
                description={copy.signals.firstMentionDescription}
                value={overview.data.hero.brandFirstMentionRate}
              />
              <SignalMeta
                label={copy.signals.trackedBrands}
                value={overview.data.trackedBrands.length.toLocaleString()}
              />
              <SignalMeta
                label={copy.signals.competitors}
                value={overview.data.competitors.length.toLocaleString()}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-neutral-900">{copy.sections.entities}</h2>
              <p className="mt-1 text-xs text-neutral-500">{copy.sections.entitiesDescription}</p>
            </div>
            <DataTable
              columns={columns}
              data={filteredEntities}
              getRowId={(row) => `${row.entityType}-${row.entityId}`}
              initialSorting={[{ id: "visibility", desc: true }]}
              emptyMessage={
                typeFilter || sentimentFilter ? (
                  <FilteredLensEntityEmptyState />
                ) : (
                  <LensEntityEmptyState />
                )
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LensDiagnosisCard({ diagnosis }: { diagnosis: LensDiagnosis }) {
  const copy = LENSES_COPY.detail.diagnosis;
  const state = copy.states[diagnosis.code];
  return (
    <Card>
      <CardContent className="p-5" role="region" aria-labelledby="lens-diagnosis-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="lens-diagnosis-title" className="text-sm font-semibold text-neutral-900">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm font-medium text-neutral-900">{state.title}</p>
            <p className="mt-1 max-w-3xl text-xs text-neutral-500">{state.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={diagnosis.priority === "High" ? "destructive" : "outline"}>
              {copy.priority}: {diagnosis.priority}
            </Badge>
            <Badge variant="secondary">
              {copy.signal}: {diagnosis.signal}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
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

function RateCell({ value }: { value: number | null }) {
  const normalized = value ?? 0;
  return (
    <div className="min-w-36 space-y-1">
      <span className="text-xs font-medium tabular-nums text-neutral-900">
        {formatNullableRate(value)}
      </span>
      <Progress value={normalized * 100} progressSize="sm" />
    </div>
  );
}

function SignalRow({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: number | null;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">{label}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums text-neutral-900">
          {formatNullableRate(value)}
        </span>
      </div>
      <Progress value={(value ?? 0) * 100} progressSize="sm" className="mt-3" />
    </div>
  );
}

function SignalMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
      <span className="text-sm text-neutral-600">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-neutral-900">{value}</span>
    </div>
  );
}

function EntityTypeFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (type: string) => void;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {entries.map(([type, count]) => (
        <FilterPill
          key={type}
          label={type}
          count={count}
          selected={selected === type}
          onClick={() => onSelect(type)}
        />
      ))}
    </div>
  );
}

function SentimentFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<EntitySentimentFilter, number>;
  selected: EntitySentimentFilter | null;
  onSelect: (sentiment: EntitySentimentFilter) => void;
}) {
  const sentiments: readonly EntitySentimentFilter[] = [
    "Positive",
    "Neutral",
    "Negative",
    "Unknown",
  ];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {sentiments.map((sentiment) => (
        <FilterPill
          key={sentiment}
          label={sentiment}
          count={counts[sentiment]}
          selected={selected === sentiment}
          onClick={() => onSelect(sentiment)}
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

function LensEntityEmptyState() {
  return (
    <div className="p-5 text-center">
      <ScanSearch className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500">
        {LENSES_COPY.detail.table.empty}
      </p>
    </div>
  );
}

function FilteredLensEntityEmptyState() {
  return (
    <div className="p-5 text-center">
      <ScanSearch className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500">
        {LENSES_COPY.detail.table.filteredEmpty}
      </p>
    </div>
  );
}

function formatNullableRate(value: number | null) {
  if (value === null) return LENSES_COPY.detail.table.noData;
  return `${Math.round(value * 100)}%`;
}

function exportLensDetailPackage(
  lens: VisibilityLens,
  overview: WorkspaceOverviewDto,
  entities: readonly WorkspaceTopEntityRowDto[],
  diagnosis: LensDiagnosis | null,
  range: DateRangeSelection,
) {
  const payload = JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      dateRange: serializeDateRange(range),
      lens: {
        code: lens.code,
        name: lens.name,
        description: lens.description,
      },
      summary: {
        queries: overview.hero.queries,
        mentions: overview.hero.mentions,
        citations: overview.hero.citations,
        brandMentionRate: overview.hero.brandMentionRate,
        brandAbsenceRate: overview.hero.brandAbsenceRate,
        brandFirstMentionRate: overview.hero.brandFirstMentionRate,
      },
      diagnosis,
      entities: entities.map((entity) => ({
        entityType: entity.entityType,
        entityId: entity.entityId,
        name: entity.name,
        isTrackedBrand: entity.isTrackedBrand,
        visibility: entity.visibility,
        shareOfVoice: entity.shareOfVoice,
        sentiment: entity.sentiment,
      })),
    },
    null,
    2,
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${lens.code.toLowerCase()}-lens-brief-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createLensReportItem(
  lens: VisibilityLens,
  overview: WorkspaceOverviewDto,
  diagnosis: LensDiagnosis,
  entities: readonly WorkspaceTopEntityRowDto[],
  range: DateRangeSelection,
): LensReportItem {
  return {
    kind: "lens-diagnosis",
    createdAt: new Date().toISOString(),
    dateRange: serializeDateRange(range),
    lens: {
      code: lens.code,
      name: lens.name,
      description: lens.description,
    },
    diagnosis,
    summary: {
      queries: overview.hero.queries,
      mentions: overview.hero.mentions,
      citations: overview.hero.citations,
      brandMentionRate: overview.hero.brandMentionRate,
      brandAbsenceRate: overview.hero.brandAbsenceRate,
      brandFirstMentionRate: overview.hero.brandFirstMentionRate,
    },
    evidence: {
      entityCount: entities.length,
      topEntities: entities.slice(0, 5).map((entity) => ({
        entityType: entity.entityType,
        name: entity.name,
        visibility: entity.visibility,
      })),
    },
  };
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
