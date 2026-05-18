import { Badge } from "@/components/ui/badge";

interface ConfidenceIndicatorProps {
  confidence: number;
}

export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  if (confidence >= 0.7) {
    return <Badge variant="success">High</Badge>;
  }
  if (confidence >= 0.4) {
    return <Badge variant="warning">Medium</Badge>;
  }
  return <Badge variant="secondary">Low</Badge>;
}
