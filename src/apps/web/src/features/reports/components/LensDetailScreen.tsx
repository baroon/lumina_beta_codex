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
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import type { WorkspaceTopEntityRowDto } from "@/types/api";

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

export function LensDetailScreen({ lensId }: LensDetailScreenProps) {
  const copy = LENSES_COPY.detail;
  const lens = LENS_BY_SLUG[lensId];
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);

  const overview = useWorkspaceOverview(range, lens ? [lens.code] : [], [], [], [], [], trackerIds);

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

  return (
    <div className="space-y-5">
      <PageHeader title={lens.name} description={lens.description}>
        <Button asChild variant="outline" size="sm">
          <Link to="/lenses">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {copy.actions.back}
          </Link>
        </Button>
        <Button variant="outline" size="sm" disabled>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.export}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <DateRangePicker value={range} onChange={setRange} />
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
              data={overview.data.topEntities}
              getRowId={(row) => `${row.entityType}-${row.entityId}`}
              initialSorting={[{ id: "visibility", desc: true }]}
              emptyMessage={<LensEntityEmptyState />}
            />
          </CardContent>
        </Card>
      </div>
    </div>
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

function formatNullableRate(value: number | null) {
  if (value === null) return LENSES_COPY.detail.table.noData;
  return `${Math.round(value * 100)}%`;
}
