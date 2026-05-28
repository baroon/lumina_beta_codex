import { useParams } from "@tanstack/react-router";
import { ScanCompetitorDetailScreen } from "@/features/reports/components/ScanCompetitorDetailScreen";

export function ScanCompetitorDetailPage() {
  const { scanRunId, competitorId } = useParams({
    from: "/scans/$scanRunId/competitors/$competitorId",
  });
  return <ScanCompetitorDetailScreen scanRunId={scanRunId} competitorId={competitorId} />;
}
