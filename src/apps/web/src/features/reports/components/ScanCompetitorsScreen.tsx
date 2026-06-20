import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, FilePlus } from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useScanCompetitors } from "@/features/reports/hooks/useScanCompetitors";
import { CompetitorsTable } from "@/features/reports/components/CompetitorsTable";
import { ScanBreadcrumb } from "@/features/reports/components/ScanBreadcrumb";
import { useState } from "react";
import type { ScanCompetitorsDto } from "@/types/api";

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
  const [reportQueued, setReportQueued] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
      <PageHeader title={copy.title} description={copy.subtitle}>
        <Button
          variant="outline"
          size="sm"
          disabled={reportQueued}
          onClick={() => {
            setReportQueued(true);
            setNotice(
              copy.actions.reportNotice.replace(
                "{count}",
                data.competitors.length.toLocaleString(),
              ),
            );
          }}
        >
          <FilePlus className="h-3.5 w-3.5" aria-hidden />
          {reportQueued ? copy.actions.addedToReport : copy.actions.addToReport}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            exportScanCompetitorsPackage(data);
            setNotice(
              copy.actions.exportNotice.replace(
                "{count}",
                data.competitors.length.toLocaleString(),
              ),
            );
          }}
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.exportPackage}
        </Button>
      </PageHeader>

      {notice && (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800">
          {notice}
        </div>
      )}

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

function exportScanCompetitorsPackage(data: ScanCompetitorsDto) {
  const payload = {
    packageType: "scan-competitors-report",
    createdAt: new Date().toISOString(),
    scanRunId: data.scanRunId,
    competitorCount: data.competitors.length,
    competitors: data.competitors,
    followUps: data.competitors.map((competitor) => ({
      label: competitor.name,
      route: `/scans/${data.scanRunId}/competitors/${competitor.competitorId}`,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `scan-competitors-${data.scanRunId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
