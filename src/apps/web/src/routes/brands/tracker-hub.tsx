import { useParams } from "@tanstack/react-router";
import { TrackerHubScreen } from "@/features/trackers/components/TrackerHubScreen";

export function TrackerHubPage() {
  const { brandId, trackerId } = useParams({ from: "/brands/$brandId/trackers/$trackerId" });
  return <TrackerHubScreen brandId={brandId} trackerId={trackerId} />;
}
