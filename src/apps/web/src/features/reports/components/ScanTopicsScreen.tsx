import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useScanTopics } from "@/features/reports/hooks/useScanTopics";
import { ScanBreadcrumb } from "@/features/reports/components/ScanBreadcrumb";
import { TopicsTable } from "@/features/reports/components/TopicsTable";

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
      <PageHeader title={copy.title} description={copy.subtitle} />

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
