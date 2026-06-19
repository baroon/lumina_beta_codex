import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, FileText, Quote, ShieldAlert, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
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
import {
  countClaimsByStatus,
  countClaimsByType,
  countRisksBySeverity,
  deriveClaimRecommendedAction,
  deriveClaimsRisksSummaryFromRows,
  deriveReviewWorkflowClaims,
  filterClaimsByStatus,
  filterClaimsByType,
  filterRisksBySeverity,
  type ClaimStatus,
  type RiskSeverity,
} from "@/features/reports/claimsRisks";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";
import { useUpdateFactualClaimReviewStatus } from "@/features/reports/hooks/useUpdateFactualClaimReviewStatus";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import type {
  WorkspaceBrandAttributeDto,
  WorkspaceBrandRiskFlagDto,
  WorkspaceFactualClaimDto,
} from "@/types/api";

export function ClaimsRisksScreen() {
  const copy = REPORTS_COPY.claimsRisks;
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | null>(null);
  const [claimTypeFilter, setClaimTypeFilter] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<RiskSeverity | null>(null);
  const [selected, setSelected] = useState<WorkspaceFactualClaimDto | null>(null);

  const overview = useWorkspaceOverview(range, [], [], [], [], [], trackerIds);
  const update = useUpdateFactualClaimReviewStatus();

  const columns = useMemo<ColumnDef<WorkspaceFactualClaimDto, unknown>[]>(
    () => [
      {
        accessorKey: "claimText",
        header: copy.claimsTable.claim,
        cell: ({ row }) => (
          <button type="button" className="text-left" onClick={() => setSelected(row.original)}>
            <span className="font-medium text-neutral-900 hover:text-primary-700">
              {row.original.claimText}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">
              {row.original.evidenceSnippet}
            </span>
          </button>
        ),
        meta: { cellClassName: "min-w-96" },
      },
      {
        accessorKey: "brandName",
        header: copy.claimsTable.brand,
      },
      {
        accessorKey: "reviewStatus",
        header: copy.claimsTable.status,
        cell: ({ row }) => <StatusBadge status={row.original.reviewStatus} />,
      },
      {
        accessorKey: "verifiability",
        header: copy.claimsTable.verifiability,
        cell: ({ row }) => <Badge variant="outline">{row.original.verifiability}</Badge>,
      },
      {
        accessorKey: "createdAt",
        header: copy.claimsTable.date,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "recommendedAction",
        header: copy.claimsTable.recommendedAction,
        cell: ({ row }) => (
          <Badge variant="outline">{deriveClaimRecommendedAction(row.original)}</Badge>
        ),
      },
    ],
    [
      copy.claimsTable.brand,
      copy.claimsTable.claim,
      copy.claimsTable.date,
      copy.claimsTable.recommendedAction,
      copy.claimsTable.status,
      copy.claimsTable.verifiability,
    ],
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

  const claims = overview.data.recentFactualClaims;
  const risks = overview.data.topBrandRiskFlags;
  const knownFor = overview.data.topBrandAttributes;
  const filteredClaims = filterClaimsByType(
    filterClaimsByStatus(claims, statusFilter),
    claimTypeFilter,
  );
  const filteredRisks = filterRisksBySeverity(risks, severityFilter);
  const summary = deriveClaimsRisksSummaryFromRows(filteredClaims, filteredRisks);
  const workflowClaims = deriveReviewWorkflowClaims(filteredClaims).filter(
    (claim) => claim.reviewStatus !== "Verified",
  );
  const statusCounts = countClaimsByStatus(claims);
  const typeCounts = countClaimsByType(claims);
  const severityCounts = countRisksBySeverity(risks);
  const hasActiveFilters =
    statusFilter != null || claimTypeFilter != null || severityFilter != null;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.subtitle}>
        <Button variant="outline" size="sm" disabled>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {copy.createReport}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <DateRangePicker value={range} onChange={setRange} />
        <StatusFilterPills
          counts={statusCounts}
          selected={statusFilter}
          onSelect={(status) => setStatusFilter((current) => (current === status ? null : status))}
        />
        <ClaimTypeFilterPills
          counts={typeCounts}
          selected={claimTypeFilter}
          onSelect={(claimType) =>
            setClaimTypeFilter((current) => (current === claimType ? null : claimType))
          }
        />
        <SeverityFilterPills
          counts={severityCounts}
          selected={severityFilter}
          onSelect={(severity) =>
            setSeverityFilter((current) => (current === severity ? null : severity))
          }
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter(null);
              setClaimTypeFilter(null);
              setSeverityFilter(null);
            }}
          >
            {copy.controls.clearFilters}
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile
          label={copy.summary.openRisks}
          value={summary.openRisks.toLocaleString()}
          helper={copy.summary.openRisksHelper}
        />
        <SummaryTile
          label={copy.summary.claimsToReview}
          value={summary.claimsToReview.toLocaleString()}
          helper={copy.summary.claimsToReviewHelper}
        />
        <SummaryTile
          label={copy.summary.disputedClaims}
          value={summary.disputedClaims.toLocaleString()}
          helper={copy.summary.disputedClaimsHelper}
        />
        <SummaryTile
          label={copy.summary.highSeverity}
          value={summary.highSeverity.toLocaleString()}
          helper={copy.summary.highSeverityHelper}
        />
      </div>

      <section className="space-y-3">
        <SectionHeader title={copy.sections.claims} description={copy.sections.claimsDescription} />
        <DataTable
          columns={columns}
          data={filteredClaims}
          getRowId={(claim) => claim.claimId}
          initialSorting={[{ id: "createdAt", desc: true }]}
          emptyMessage={hasActiveFilters ? <FilteredEmptyState /> : <ClaimsEmptyState />}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ThemeCard
          icon={AlertTriangle}
          title={copy.sections.risks}
          description={copy.sections.risksDescription}
          empty="No risk themes detected in this period."
        >
          {filteredRisks.map((risk) => (
            <RiskThemeRow key={`${risk.rank}:${risk.flagType}`} risk={risk} />
          ))}
        </ThemeCard>

        <ThemeCard
          icon={ShieldAlert}
          title={copy.sections.knownFor}
          description={copy.sections.knownForDescription}
          empty="No known-for themes detected in this period."
        >
          {knownFor.map((attribute) => (
            <KnownForRow key={`${attribute.rank}:${attribute.name}`} attribute={attribute} />
          ))}
        </ThemeCard>
      </div>

      <Card>
        <CardContent className="p-5">
          <SectionHeader
            title={copy.sections.workflow}
            description={copy.sections.workflowDescription}
          />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(["Pending", "Verified", "Disputed"] as const).map((status) => (
              <SummaryTile
                key={status}
                label={copy.statuses[status]}
                value={filteredClaims
                  .filter((claim) => claim.reviewStatus === status)
                  .length.toLocaleString()}
                helper={workflowHelper(status)}
              />
            ))}
          </div>
          <ReviewWorkflowQueue claims={workflowClaims} onOpen={setSelected} />
        </CardContent>
      </Card>

      <ClaimReviewDrawer
        claim={selected}
        isSaving={update.isPending}
        error={update.error}
        failedClaimId={update.variables?.claimId}
        onClose={() => setSelected(null)}
        onStatusChange={(claimId, reviewStatus) => update.mutate({ claimId, reviewStatus })}
      />
    </div>
  );
}

function ReviewWorkflowQueue({
  claims,
  onOpen,
}: {
  claims: readonly WorkspaceFactualClaimDto[];
  onOpen: (claim: WorkspaceFactualClaimDto) => void;
}) {
  const copy = REPORTS_COPY.claimsRisks.workflowQueue;

  return (
    <section className="mt-5" aria-labelledby="claims-workflow-queue-title">
      <div>
        <h3 id="claims-workflow-queue-title" className="text-sm font-semibold text-neutral-900">
          {copy.title}
        </h3>
        <p className="mt-1 text-xs text-neutral-500">{copy.description}</p>
      </div>
      {claims.length === 0 ? (
        <p className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          {copy.empty}
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {claims.slice(0, 4).map((claim) => (
            <div
              key={claim.claimId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{claim.claimText}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <StatusBadge status={claim.reviewStatus} />
                  <Badge variant="outline">{deriveClaimRecommendedAction(claim)}</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onOpen(claim)}>
                {copy.openReview}
              </Button>
            </div>
          ))}
        </div>
      )}
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

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
    </div>
  );
}

function ClaimsEmptyState() {
  return (
    <div className="p-5 text-center">
      <Quote className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold text-neutral-900">No claims or risks yet</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm text-neutral-500">
        Claims appear after Lumina analyzes AI answers for factual statements, risky language, and
        recurring brand descriptions.
      </p>
    </div>
  );
}

function FilteredEmptyState() {
  const copy = REPORTS_COPY.claimsRisks.empty;
  return (
    <div className="p-5 text-center">
      <Quote className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold text-neutral-900">{copy.filteredTitle}</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm text-neutral-500">{copy.filteredDescription}</p>
    </div>
  );
}

function StatusFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<ClaimStatus, number>;
  selected: ClaimStatus | null;
  onSelect: (status: ClaimStatus) => void;
}) {
  const copy = REPORTS_COPY.claimsRisks;
  const statuses: readonly ClaimStatus[] = ["Pending", "Verified", "Disputed"];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {statuses.map((status) => (
        <FilterPill
          key={status}
          label={copy.statuses[status]}
          count={counts[status]}
          selected={selected === status}
          onClick={() => onSelect(status)}
        />
      ))}
    </div>
  );
}

function SeverityFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<RiskSeverity, number>;
  selected: RiskSeverity | null;
  onSelect: (severity: RiskSeverity) => void;
}) {
  const severities: readonly RiskSeverity[] = ["High", "Medium", "Low"];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {severities.map((severity) => (
        <FilterPill
          key={severity}
          label={severity}
          count={counts[severity]}
          selected={selected === severity}
          onClick={() => onSelect(severity)}
        />
      ))}
    </div>
  );
}

function ClaimTypeFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (claimType: string) => void;
}) {
  const claimTypes = Object.keys(counts).sort((a, b) => a.localeCompare(b));
  return (
    <div className="flex flex-wrap items-center gap-1">
      {claimTypes.map((claimType) => (
        <FilterPill
          key={claimType}
          label={claimType}
          count={counts[claimType] ?? 0}
          selected={selected === claimType}
          onClick={() => onSelect(claimType)}
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

function ThemeCard({
  icon: Icon,
  title,
  description,
  empty,
  children,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <SectionHeader title={title} description={description} />
        </div>
        <div className="mt-4 space-y-2">
          {children.length === 0 ? <p className="text-sm text-neutral-500">{empty}</p> : children}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskThemeRow({ risk }: { risk: WorkspaceBrandRiskFlagDto }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-neutral-900">{formatSlug(risk.flagType)}</p>
        <p className="text-xs text-neutral-500">{risk.mentionCount} mentions</p>
      </div>
      <Badge variant={riskSeverityVariant(risk.severity)}>{risk.severity}</Badge>
    </div>
  );
}

function KnownForRow({ attribute }: { attribute: WorkspaceBrandAttributeDto }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-neutral-900">{attribute.name}</p>
        <p className="text-xs text-neutral-500">{attribute.mentionCount} mentions</p>
      </div>
      <Badge variant={attribute.polarity === "Negative" ? "destructive" : "secondary"}>
        {attribute.polarity}
      </Badge>
    </div>
  );
}

function ClaimReviewDrawer({
  claim,
  isSaving,
  error,
  failedClaimId,
  onClose,
  onStatusChange,
}: {
  claim: WorkspaceFactualClaimDto | null;
  isSaving: boolean;
  error: unknown;
  failedClaimId?: string;
  onClose: () => void;
  onStatusChange: (claimId: string, reviewStatus: ClaimStatus) => void;
}) {
  const copy = REPORTS_COPY.claimsRisks.drawer;
  if (!claim) return null;

  const failedHere = failedClaimId === claim.claimId;

  return (
    <div className="fixed inset-0 z-50 bg-black/20" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-review-title"
        className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-neutral-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {copy.title}
            </p>
            <h2 id="claim-review-title" className="mt-1 text-lg font-semibold text-neutral-900">
              {claim.claimText}
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
          <DrawerSection title={copy.evidence}>{claim.evidenceSnippet}</DrawerSection>
          <div className="grid grid-cols-2 gap-3">
            <DrawerMeta label={copy.subject} value={formatSlug(claim.subject)} />
            <DrawerMeta label={copy.assertedValue} value={claim.assertedValue} />
            <DrawerMeta label={copy.verifiability} value={claim.verifiability} />
            <DrawerMeta label={copy.reviewStatus} value={statusLabel(claim.reviewStatus)} />
          </div>

          {failedHere && (
            <p
              className="rounded-md bg-semantic-error-50 px-3 py-2 text-sm text-semantic-error-700"
              role="alert"
            >
              {error instanceof Error ? error.message : copy.saveError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 p-4">
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => onStatusChange(claim.claimId, "Pending")}
          >
            {copy.resetPending}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => onStatusChange(claim.claimId, "Disputed")}
          >
            {copy.markDisputed}
          </Button>
          <Button
            size="sm"
            disabled={isSaving}
            onClick={() => onStatusChange(claim.claimId, "Verified")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {copy.markVerified}
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

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Verified" ? "success" : status === "Disputed" ? "destructive" : "warning";
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}

function statusLabel(status: string) {
  return REPORTS_COPY.claimsRisks.statuses[status] ?? status;
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

function workflowHelper(status: ClaimStatus) {
  switch (status) {
    case "Pending":
      return "Needs a human review decision.";
    case "Verified":
      return "Confirmed accurate against source of truth.";
    case "Disputed":
      return "Needs correction, context, or monitoring.";
  }
}

function formatSlug(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(value));
}
