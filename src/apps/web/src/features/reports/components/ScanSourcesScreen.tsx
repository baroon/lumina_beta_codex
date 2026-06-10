import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ApiError } from "@/api/apiClient";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useScanSources } from "@/features/reports/hooks/useScanSources";
import { useSourceTypes } from "@/features/reports/hooks/useSourceTypes";
import { useUpdateSourceClassification } from "@/features/reports/hooks/useUpdateSourceClassification";
import { SourceCitationsDrawer } from "@/features/reports/components/SourceCitationsDrawer";
import { SourcesTable } from "@/features/reports/components/SourcesTable";
import { ScanBreadcrumb } from "@/features/reports/components/ScanBreadcrumb";
import { ArrowLeft } from "lucide-react";

interface ScanSourcesScreenProps {
  scanRunId: string;
}

/**
 * Source/Citation view screen (Phase 4 Slice 2). Composes the table +
 * drawer, wires the user-correction mutation through, and renders empty
 * + loading + error states per ADR-004 §"Status and empty states".
 */
export function ScanSourcesScreen({ scanRunId }: ScanSourcesScreenProps) {
  const sources = useScanSources(scanRunId);
  const sourceTypes = useSourceTypes();
  const updateClassification = useUpdateSourceClassification(scanRunId);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  const copy = REPORTS_COPY.sources;

  if (sources.isLoading || sourceTypes.isLoading) {
    return <LoadingPage />;
  }

  if (sources.isError) {
    if (sources.error instanceof ApiError && sources.error.status === 404) {
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
        error={sources.error instanceof Error ? sources.error : undefined}
        onReset={() => void sources.refetch()}
      />
    );
  }

  if (!sources.data) return null;

  const handleClassify = (sourceId: string, sourceType: string) => {
    updateClassification.mutate({ sourceId, brandId: sources.data.brandId, sourceType });
  };

  return (
    <div className="space-y-6">
      <ScanBreadcrumb scanRunId={scanRunId} currentLabel="Sources" />
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Link
        to="/scans/$scanRunId/results"
        params={{ scanRunId }}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {copy.backToResults}
      </Link>

      <SourcesTable
        sources={sources.data.sources}
        sourceTypes={sourceTypes.data ?? []}
        onClassify={handleClassify}
        onSelectSource={setSelectedSourceId}
        classifyDisabled={updateClassification.isPending}
      />

      <SourceCitationsDrawer
        scanRunId={scanRunId}
        sourceId={selectedSourceId}
        onClose={() => setSelectedSourceId(null)}
      />
    </div>
  );
}
