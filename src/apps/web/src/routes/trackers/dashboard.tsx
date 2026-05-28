import { useParams } from "@tanstack/react-router";
import { TrackerDashboardScreen } from "@/features/reports/components/TrackerDashboardScreen";

export function TrackerDashboardPage() {
  const { trackerId } = useParams({ from: "/trackers/$trackerId/dashboard" });
  return <TrackerDashboardScreen trackerId={trackerId} />;
}
