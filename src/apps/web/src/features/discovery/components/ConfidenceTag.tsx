import { Badge } from "@/components/atoms/badge";
import { SignalHigh, SignalMedium, SignalLow, type LucideIcon } from "lucide-react";
import { DISCOVERY_COPY } from "@/content/discovery";
import { getConfidenceLevel, type ConfidenceLevel } from "../confidence";

interface ConfidenceTagProps {
  confidence: number;
}

const VARIANT_MAP = {
  high: "success",
  medium: "warning",
  low: "secondary",
} as const;

const ICON_MAP: Record<ConfidenceLevel, LucideIcon> = {
  high: SignalHigh,
  medium: SignalMedium,
  low: SignalLow,
};

export function ConfidenceTag({ confidence }: ConfidenceTagProps) {
  const level = getConfidenceLevel(confidence);
  const Icon = ICON_MAP[level];
  return (
    <Badge variant={VARIANT_MAP[level]} className="gap-1">
      <Icon className="h-3 w-3" />
      {DISCOVERY_COPY.confidence[level]}
    </Badge>
  );
}
