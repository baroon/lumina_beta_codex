import { useParams } from "@tanstack/react-router";
import { ScanCompetitorsScreen } from "@/features/reports/components/ScanCompetitorsScreen";

export function ScanCompetitorsPage() {
  const { scanRunId } = useParams({ from: "/scans/$scanRunId/competitors" });
  return <ScanCompetitorsScreen scanRunId={scanRunId} />;
}
