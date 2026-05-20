import { Badge } from "@/components/atoms/badge";
import { DISCOVERY_COPY } from "@/content/discovery";
import { getConfidenceLevel } from "../confidence";

interface ConfidenceTagProps {
  confidence: number;
}

const VARIANT_MAP = {
  high: "success",
  medium: "warning",
  low: "secondary",
} as const;

export function ConfidenceTag({ confidence }: ConfidenceTagProps) {
  const level = getConfidenceLevel(confidence);
  return <Badge variant={VARIANT_MAP[level]}>{DISCOVERY_COPY.confidence[level]}</Badge>;
}
