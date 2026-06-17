import { useParams } from "@tanstack/react-router";
import { LensDetailScreen } from "@/features/reports/components/LensDetailScreen";

export function LensDetailPage() {
  const { lensId } = useParams({ from: "/lenses/$lensId" });
  return <LensDetailScreen lensId={lensId} />;
}
