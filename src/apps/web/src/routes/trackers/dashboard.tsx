import { useParams } from "@tanstack/react-router";
import { TrackerDashboardV2Screen } from "@/features/reports/components/TrackerDashboardV2Screen";

export function TrackerDashboardPage() {
  const { trackerId } = useParams({ from: "/trackers/$trackerId/dashboard" });
  return <TrackerDashboardV2Screen trackerId={trackerId} />;
}
