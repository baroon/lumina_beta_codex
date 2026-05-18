import { Badge } from "@/components/ui/badge";
import { DISCOVERY_COPY } from "@/content/discovery";

interface ConfidenceIndicatorProps {
  confidence: number;
}

export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  if (confidence >= 0.7) {
    return <Badge variant="success">{DISCOVERY_COPY.confidence.high}</Badge>;
  }
  if (confidence >= 0.4) {
    return <Badge variant="warning">{DISCOVERY_COPY.confidence.medium}</Badge>;
  }
  return <Badge variant="secondary">{DISCOVERY_COPY.confidence.low}</Badge>;
}
