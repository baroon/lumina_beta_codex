import { useParams } from "@tanstack/react-router";
import { ScanClaimsScreen } from "@/features/reports/components/ScanClaimsScreen";

export function ScanClaimsPage() {
  const { scanRunId } = useParams({ from: "/scans/$scanRunId/claims" });
  return <ScanClaimsScreen scanRunId={scanRunId} />;
}
