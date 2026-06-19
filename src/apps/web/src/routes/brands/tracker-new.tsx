import { useParams } from "@tanstack/react-router";
import { ReadyToCreateTrackerScreen } from "@/features/trackers/components/ReadyToCreateTrackerScreen";

export function NewTrackerPage() {
  const { brandId } = useParams({ from: "/brands/$brandId/trackers/new" });
  return <ReadyToCreateTrackerScreen brandId={brandId} />;
}
