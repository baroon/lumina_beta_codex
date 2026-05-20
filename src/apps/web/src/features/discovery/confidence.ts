import type { CandidateDto } from "@/types/api";

/**
 * Confidence thresholds used for display (ConfidenceTag) and preselection.
 * A single source of truth ensures "High" items are always preselected.
 */
export const CONFIDENCE_THRESHOLDS = {
  high: 0.7,
  medium: 0.4,
} as const;

export type ConfidenceLevel = "high" | "medium" | "low";

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

export function isHighConfidence(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLDS.high;
}

/**
 * Returns the IDs of candidates that should be preselected (high confidence).
 */
export function preselectCandidates(candidates: CandidateDto[]): Set<string> {
  return new Set(candidates.filter((c) => isHighConfidence(c.confidence)).map((c) => c.id));
}
