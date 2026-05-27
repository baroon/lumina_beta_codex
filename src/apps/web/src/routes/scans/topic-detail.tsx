import { useParams } from "@tanstack/react-router";
import { ScanTopicDetailScreen } from "@/features/reports/components/ScanTopicDetailScreen";

export function ScanTopicDetailPage() {
  const { scanRunId, topicId } = useParams({ from: "/scans/$scanRunId/topics/$topicId" });
  return <ScanTopicDetailScreen scanRunId={scanRunId} topicId={topicId} />;
}
