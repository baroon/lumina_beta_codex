import { useParams } from "@tanstack/react-router";
import { ScanTopicsScreen } from "@/features/reports/components/ScanTopicsScreen";

export function ScanTopicsPage() {
  const { scanRunId } = useParams({ from: "/scans/$scanRunId/topics" });
  return <ScanTopicsScreen scanRunId={scanRunId} />;
}
