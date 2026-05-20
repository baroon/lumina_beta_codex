import { describe, it, expect } from "vitest";
import {
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel,
  isHighConfidence,
  preselectCandidates,
} from "./confidence";
import type { CandidateDto } from "@/types/api";

function makeCandidate(
  overrides: Partial<CandidateDto> & { id: string; confidence: number },
): CandidateDto {
  return {
    name: "Test",
    description: null,
    source: "LLMSuggested",
    status: "Suggested",
    metadata: {},
    ...overrides,
  };
}

describe("CONFIDENCE_THRESHOLDS", () => {
  it("has high threshold at 0.7", () => {
    expect(CONFIDENCE_THRESHOLDS.high).toBe(0.7);
  });

  it("has medium threshold at 0.4", () => {
    expect(CONFIDENCE_THRESHOLDS.medium).toBe(0.4);
  });
});

describe("getConfidenceLevel", () => {
  it('returns "high" at exactly 0.7', () => {
    expect(getConfidenceLevel(0.7)).toBe("high");
  });

  it('returns "high" above 0.7', () => {
    expect(getConfidenceLevel(0.85)).toBe("high");
    expect(getConfidenceLevel(1.0)).toBe("high");
  });

  it('returns "medium" at exactly 0.4', () => {
    expect(getConfidenceLevel(0.4)).toBe("medium");
  });

  it('returns "medium" between 0.4 and 0.7', () => {
    expect(getConfidenceLevel(0.5)).toBe("medium");
    expect(getConfidenceLevel(0.69)).toBe("medium");
  });

  it('returns "low" below 0.4', () => {
    expect(getConfidenceLevel(0.39)).toBe("low");
    expect(getConfidenceLevel(0.0)).toBe("low");
    expect(getConfidenceLevel(0.1)).toBe("low");
  });
});

describe("isHighConfidence", () => {
  it("returns true at exactly 0.7", () => {
    expect(isHighConfidence(0.7)).toBe(true);
  });

  it("returns true above 0.7", () => {
    expect(isHighConfidence(0.85)).toBe(true);
    expect(isHighConfidence(1.0)).toBe(true);
  });

  it("returns false just below 0.7", () => {
    expect(isHighConfidence(0.69)).toBe(false);
    expect(isHighConfidence(0.5)).toBe(false);
    expect(isHighConfidence(0.0)).toBe(false);
  });
});

describe("preselectCandidates", () => {
  it("selects only high-confidence candidates", () => {
    const candidates = [
      makeCandidate({ id: "a", confidence: 0.85 }),
      makeCandidate({ id: "b", confidence: 0.7 }),
      makeCandidate({ id: "c", confidence: 0.65 }),
      makeCandidate({ id: "d", confidence: 0.4 }),
    ];

    const selected = preselectCandidates(candidates);
    expect(selected).toEqual(new Set(["a", "b"]));
  });

  it("returns empty set when no candidates meet the threshold", () => {
    const candidates = [
      makeCandidate({ id: "a", confidence: 0.5 }),
      makeCandidate({ id: "b", confidence: 0.3 }),
    ];

    const selected = preselectCandidates(candidates);
    expect(selected.size).toBe(0);
  });

  it("selects all candidates when all are high confidence", () => {
    const candidates = [
      makeCandidate({ id: "a", confidence: 0.9 }),
      makeCandidate({ id: "b", confidence: 0.75 }),
      makeCandidate({ id: "c", confidence: 0.7 }),
    ];

    const selected = preselectCandidates(candidates);
    expect(selected).toEqual(new Set(["a", "b", "c"]));
  });

  it("handles empty array", () => {
    expect(preselectCandidates([]).size).toBe(0);
  });

  it("preselection aligns with high confidence display — every preselected item is high", () => {
    const candidates = [
      makeCandidate({ id: "high1", confidence: 0.95 }),
      makeCandidate({ id: "high2", confidence: 0.7 }),
      makeCandidate({ id: "med1", confidence: 0.69 }),
      makeCandidate({ id: "med2", confidence: 0.4 }),
      makeCandidate({ id: "low1", confidence: 0.2 }),
    ];

    const selected = preselectCandidates(candidates);

    for (const c of candidates) {
      const shouldBeSelected = isHighConfidence(c.confidence);
      const isSelected = selected.has(c.id);
      expect(isSelected).toBe(shouldBeSelected);
    }
  });
});
