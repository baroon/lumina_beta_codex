import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, FilePlus } from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useScanTopics } from "@/features/reports/hooks/useScanTopics";
import { ScanBreadcrumb } from "@/features/reports/components/ScanBreadcrumb";
import { TopicsTable } from "@/features/reports/components/TopicsTable";
import type { ScanTopicsDto } from "@/types/api";

interface ScanTopicsScreenProps {
  scanRunId: string;
}

/**
 * Topic view list screen (Phase 4 Slice 3). Composes the per-topic table
 * with header navigation back to Scan Results. Row click drills into the
 * topic detail route.
 */
export function ScanTopicsScreen({ scanRunId }: ScanTopicsScreenProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useScanTopics(scanRunId);
  const [reportQueued, setReportQueued] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const copy = REPORTS_COPY.topics;

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
      <ScanBreadcrumb scanRunId={scanRunId} currentLabel="Topics" />
      <PageHeader title={copy.title} description={copy.subtitle}>
        <Button
          variant="outline"
          size="sm"
          disabled={reportQueued}
          onClick={() => {
            setReportQueued(true);
            setNotice(
              copy.actions.reportNotice.replace("{count}", data.topics.length.toLocaleString()),
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
            exportScanTopicsPackage(data);
            setNotice(
              copy.actions.exportNotice.replace("{count}", data.topics.length.toLocaleString()),
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

      <TopicsTable
        topics={data.topics}
        onSelectTopic={(topicId) =>
          navigate({ to: "/scans/$scanRunId/topics/$topicId", params: { scanRunId, topicId } })
        }
      />
    </div>
  );
}

function exportScanTopicsPackage(data: ScanTopicsDto) {
  const payload = {
    packageType: "scan-topics-report",
    createdAt: new Date().toISOString(),
    scanRunId: data.scanRunId,
    topicCount: data.topics.length,
    topics: data.topics,
    followUps: data.topics.map((topic) => ({
      label: topic.topicName,
      route: `/scans/${data.scanRunId}/topics/${topic.topicId}`,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `scan-topics-${data.scanRunId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
