import { useParams } from "@tanstack/react-router";
import { TrackerEditScreen } from "@/features/trackers/components/TrackerEditScreen";

export function TrackerEditPage() {
  const { brandId, trackerId } = useParams({
    from: "/brands/$brandId/trackers/$trackerId/edit",
  });
  return <TrackerEditScreen brandId={brandId} trackerId={trackerId} />;
}
