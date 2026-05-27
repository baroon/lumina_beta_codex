import { useParams } from "@tanstack/react-router";
import { ScanSourcesScreen } from "@/features/reports/components/ScanSourcesScreen";

export function ScanSourcesPage() {
  const { scanRunId } = useParams({ from: "/scans/$scanRunId/sources" });
  return <ScanSourcesScreen scanRunId={scanRunId} />;
}
