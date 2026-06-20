import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ApiError } from "@/api/apiClient";
import { Button } from "@/components/atoms/button";
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
import { ArrowLeft, Download, FilePlus } from "lucide-react";
import type { ScanSourcesDto, SourceTypeReferenceDto } from "@/types/api";

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
  const [reportQueued, setReportQueued] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
                sources.data.sources.length.toLocaleString(),
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
            exportScanSourcesPackage(sources.data, sourceTypes.data ?? []);
            setNotice(
              copy.actions.exportNotice.replace(
                "{count}",
                sources.data.sources.length.toLocaleString(),
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

function exportScanSourcesPackage(data: ScanSourcesDto, sourceTypes: SourceTypeReferenceDto[]) {
  const typeLabels = new Map(sourceTypes.map((type) => [type.code, type.name]));
  const payload = {
    packageType: "scan-sources-report",
    createdAt: new Date().toISOString(),
    scanRunId: data.scanRunId,
    brandId: data.brandId,
    sourceCount: data.sources.length,
    sources: data.sources.map((source) => ({
      ...source,
      sourceTypeLabel: typeLabels.get(source.sourceType) ?? source.sourceType,
    })),
    followUps: [
      {
        label: REPORTS_COPY.scanResults.viewClaims,
        route: `/scans/${data.scanRunId}/claims`,
      },
      {
        label: REPORTS_COPY.scanResults.title,
        route: `/scans/${data.scanRunId}/results`,
      },
    ],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `scan-sources-${data.scanRunId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
