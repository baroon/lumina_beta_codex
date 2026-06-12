import { describe, it, expect } from "vitest";
import type { WorkspaceOverviewDto } from "@/types/api";
import { buildSignalHighlights } from "./signalHighlights";

function emptyDto(overrides: Partial<WorkspaceOverviewDto> = {}): WorkspaceOverviewDto {
  return {
    workspaceId: "w1",
    from: "2026-05-09T00:00:00Z",
    to: "2026-06-09T00:00:00Z",
    scanCount: 4,
    trackedBrands: [],
    competitors: [],
    hero: {
      queries: 0,
      mentions: 0,
      citations: 0,
      brandMentionRate: null,
      brandAbsenceRate: null,
      brandFirstMentionRate: null,
    },
    previousHero: null,
    series: [],
    topEntities: [],
    topBrandAttributes: [],
    coMentions: [],
    topBrandRiskFlags: [],
    topBrandComparisons: [],
    topicOwnership: [],
    recentFactualClaims: [],
    ...overrides,
  };
}

describe("buildSignalHighlights", () => {
  it("returns an empty list when no signals have data", () => {
    expect(buildSignalHighlights(emptyDto())).toEqual([]);
  });

  it("emits the absence bullet only when absence rate is >= 25%", () => {
    const at25 = buildSignalHighlights(
      emptyDto({
        hero: {
          queries: 0,
          mentions: 0,
          citations: 0,
          brandMentionRate: null,
          brandAbsenceRate: 0.25,
          brandFirstMentionRate: null,
        },
      }),
    );
    expect(at25.find((h) => h.id === "absence")?.text).toContain("25%");

    const below = buildSignalHighlights(
      emptyDto({
        hero: {
          queries: 0,
          mentions: 0,
          citations: 0,
          brandMentionRate: null,
          brandAbsenceRate: 0.2,
          brandFirstMentionRate: null,
        },
      }),
    );
    expect(below.find((h) => h.id === "absence")).toBeUndefined();
  });

  it("emits attributes with polarity in lowercase", () => {
    const out = buildSignalHighlights(
      emptyDto({
        topBrandAttributes: [
          { rank: 1, name: "trustworthy", polarity: "Positive", mentionCount: 8 },
          { rank: 2, name: "slow", polarity: "Negative", mentionCount: 3 },
        ],
      }),
    );
    expect(out.find((h) => h.id === "attributes")?.text).toBe(
      'AI describes your brand as "trustworthy" (positive), "slow" (negative).',
    );
  });

  it("sums risk flag mentions across types and lists the top two", () => {
    const out = buildSignalHighlights(
      emptyDto({
        topBrandRiskFlags: [
          { rank: 1, flagType: "layoffs", severity: "High", mentionCount: 3 },
          { rank: 2, flagType: "outage", severity: "Medium", mentionCount: 1 },
        ],
      }),
    );
    // 3 + 1 = 4 total mentions; top types are "layoffs, outage".
    expect(out.find((h) => h.id === "risk")?.text).toBe(
      "4 risk flags raised — most often: layoffs, outage.",
    );
  });

  it("frames head-to-head as 'win on X, lose on Y' when both exist", () => {
    const out = buildSignalHighlights(
      emptyDto({
        topBrandComparisons: [
          { rank: 1, aspect: "price", winCount: 4, lossCount: 1 },
          { rank: 2, aspect: "support_quality", winCount: 0, lossCount: 3 },
        ],
      }),
    );
    expect(out.find((h) => h.id === "comparisons")?.text).toBe(
      "Head-to-head: AI judges you win on price, lose on support_quality.",
    );
  });

  it("frames topic ownership as 'own X, lose Y' using the 66/33 thresholds", () => {
    const out = buildSignalHighlights(
      emptyDto({
        topicOwnership: [
          { rank: 1, topicName: "Career advice", promptCount: 10, brandMentionedPromptCount: 8 },
          { rank: 2, topicName: "Industry news", promptCount: 6, brandMentionedPromptCount: 1 },
          { rank: 3, topicName: "Mid topic", promptCount: 10, brandMentionedPromptCount: 5 },
        ],
      }),
    );
    // 80% ≥ 66.6%, 17% ≤ 33.3% — mid topic ignored.
    expect(out.find((h) => h.id === "topics")?.text).toBe(
      'Topic mix: you own "Career advice" (80%), lose "Industry news" (17%).',
    );
  });

  it("counts disputed and pending factual claims separately", () => {
    const out = buildSignalHighlights(
      emptyDto({
        recentFactualClaims: [
          {
            claimId: "c1",
            brandId: "b1",
            brandName: "Acme",
            subject: "founding_year",
            assertedValue: "1975",
            claimText: "x",
            evidenceSnippet: "x",
            verifiability: "Verifiable",
            reviewStatus: "Disputed",
            createdAt: "2026-05-01T00:00:00Z",
          },
          {
            claimId: "c2",
            brandId: "b1",
            brandName: "Acme",
            subject: "headquarters",
            assertedValue: "SF",
            claimText: "y",
            evidenceSnippet: "y",
            verifiability: "Verifiable",
            reviewStatus: "Pending",
            createdAt: "2026-05-02T00:00:00Z",
          },
          {
            claimId: "c3",
            brandId: "b1",
            brandName: "Acme",
            subject: "x",
            assertedValue: "y",
            claimText: "z",
            evidenceSnippet: "z",
            verifiability: "Verifiable",
            reviewStatus: "Verified",
            createdAt: "2026-05-03T00:00:00Z",
          },
        ],
      }),
    );
    expect(out.find((h) => h.id === "claims")?.text).toBe(
      "Factual claims: 1 disputed, 1 pending review.",
    );
  });
});
