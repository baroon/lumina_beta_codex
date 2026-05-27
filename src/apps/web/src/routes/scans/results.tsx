import { useParams } from "@tanstack/react-router";
import { ScanResultsScreen } from "@/features/reports/components/ScanResultsScreen";

export function ScanResultsPage() {
  const { scanRunId } = useParams({ from: "/scans/$scanRunId/results" });
  return <ScanResultsScreen scanRunId={scanRunId} />;
}
