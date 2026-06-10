import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { cn } from "@/lib/utils";
import { useScanClaims } from "@/features/reports/hooks/useScanClaims";
import { ScanBreadcrumb } from "@/features/reports/components/ScanBreadcrumb";

interface ScanClaimsScreenProps {
  scanRunId: string;
}

const REVIEW_STATUS_FILTERS = ["All", "Pending", "Verified", "Disputed"] as const;
type ReviewFilter = (typeof REVIEW_STATUS_FILTERS)[number];

/**
 * Scan-scoped factual-claims inbox (Phase 4 measurement-model expansion,
 * item #14). Lets a reviewer skim every check-able claim the AI made
 * about the brand on this scan, filter by review status, and (in a
 * future slice) dispute / verify each one.
 */
export function ScanClaimsScreen({ scanRunId }: ScanClaimsScreenProps) {
  const [filter, setFilter] = useState<ReviewFilter>("All");
  const apiFilter = filter === "All" ? undefined : filter;
  const { data, isLoading, isError, error, refetch } = useScanClaims(scanRunId, apiFilter);
  const copy = REPORTS_COPY.claims;

  if (isLoading) return <LoadingPage />;

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            {copy.empty.notFound}
          </CardContent>
        </Card>
      );
    }
    return (
      <ErrorPage
        error={error instanceof Error ? error : undefined}
        onReset={() => void refetch()}
      />
    );
  }

  if (!data) return null;
  const claims = data.claims;

  return (
    <div className="space-y-6">
      <ScanBreadcrumb scanRunId={scanRunId} currentLabel="Claims" />
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Link
        to="/scans/$scanRunId/results"
        params={{ scanRunId }}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {copy.backToResults}
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {copy.filterLabel}
        </span>
        {REVIEW_STATUS_FILTERS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filter === status ? "default" : "outline"}
            onClick={() => setFilter(status)}
          >
            {copy.statusLabels[status] ?? status}
          </Button>
        ))}
      </div>

      {claims.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            {filter === "All" ? copy.empty.noClaims : copy.empty.noClaimsForFilter}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3" role="list">
          {claims.map((c) => (
            <li key={c.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{c.claimText}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                        <span>
                          {copy.row.about}{" "}
                          <strong className="text-neutral-700">{c.entityName}</strong>
                        </span>
                        <span>
                          {copy.row.subject}{" "}
                          <code className="rounded bg-neutral-100 px-1 py-0.5 text-[11px] text-neutral-700">
                            {c.subject}
                          </code>
                        </span>
                        <span>
                          {copy.row.value}{" "}
                          <strong className="text-neutral-700">{c.assertedValue}</strong>
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Badge variant={verifiabilityVariant(c.verifiability)} className="text-xs">
                        {copy.verifiabilityLabels[c.verifiability] ?? c.verifiability}
                      </Badge>
                      <Badge variant={statusVariant(c.reviewStatus)} className="text-xs">
                        {copy.statusLabels[c.reviewStatus] ?? c.reviewStatus}
                      </Badge>
                    </div>
                  </div>
                  {c.evidenceSnippet && (
                    <p
                      className={cn(
                        "rounded-md border-l-2 border-neutral-200 bg-neutral-50 px-3 py-2 text-xs italic text-neutral-600",
                      )}
                    >
                      &ldquo;{c.evidenceSnippet}&rdquo;
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function verifiabilityVariant(
  verifiability: string,
): "default" | "secondary" | "outline" | "success" | "warning" | "destructive" {
  switch (verifiability) {
    case "Verifiable":
      return "default";
    case "Subjective":
      return "warning";
    case "Unverifiable":
    default:
      return "secondary";
  }
}

function statusVariant(
  status: string,
): "default" | "secondary" | "outline" | "success" | "warning" | "destructive" {
  switch (status) {
    case "Verified":
      return "success";
    case "Disputed":
      return "destructive";
    case "Pending":
    default:
      return "outline";
  }
}
