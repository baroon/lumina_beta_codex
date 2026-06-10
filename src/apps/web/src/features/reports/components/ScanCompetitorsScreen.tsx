import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useScanCompetitors } from "@/features/reports/hooks/useScanCompetitors";
import { CompetitorsTable } from "@/features/reports/components/CompetitorsTable";
import { ScanBreadcrumb } from "@/features/reports/components/ScanBreadcrumb";

interface ScanCompetitorsScreenProps {
  scanRunId: string;
}

/**
 * Competitor view list screen (Phase 4 Slice 4). Mirrors the Topic view
 * shape — header + back link + table; row click navigates to the
 * competitor detail route.
 */
export function ScanCompetitorsScreen({ scanRunId }: ScanCompetitorsScreenProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useScanCompetitors(scanRunId);
  const copy = REPORTS_COPY.competitors;

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

  return (
    <div className="space-y-6">
      <ScanBreadcrumb scanRunId={scanRunId} currentLabel="Competitors" />
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Link
        to="/scans/$scanRunId/results"
        params={{ scanRunId }}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {copy.backToResults}
      </Link>

      <CompetitorsTable
        competitors={data.competitors}
        onSelectCompetitor={(competitorId) =>
          navigate({
            to: "/scans/$scanRunId/competitors/$competitorId",
            params: { scanRunId, competitorId },
          })
        }
      />
    </div>
  );
}
