import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";
import { ReportsScreen } from "./ReportsScreen";

let overviewState: {
  data?: WorkspaceOverviewDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: ReturnType<typeof vi.fn>;
};
let competitiveState: {
  data?: WorkspaceCompetitiveDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => ({ scope: "all" }),
}));

vi.mock("@/features/reports/hooks/useWorkspaceOverview", () => ({
  useWorkspaceOverview: () => overviewState,
}));

vi.mock("@/features/reports/hooks/useWorkspaceCompetitive", () => ({
  useWorkspaceCompetitive: () => competitiveState,
}));

beforeEach(() => {
  overviewState = {
    data: overview(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
  competitiveState = {
    data: competitive(),
    isLoading: false,
    isError: false,
  };
});

describe("ReportsScreen", () => {
  it("renders report readiness from workspace evidence", () => {
    render(<ReportsScreen />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("Report-ready sections")).toBeInTheDocument();
    expect(screen.getByText("Evidence links")).toBeInTheDocument();
    expect(screen.getByText("Open client actions")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create report" })).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("Monthly AI visibility report")).toBeInTheDocument();
    expect(screen.getByText("Report history")).toBeInTheDocument();
  });

  it("shows unavailable copy when competitive report data fails", () => {
    competitiveState = { data: undefined, isLoading: false, isError: true };

    render(<ReportsScreen />);

    expect(screen.getByText("Competitive report sections are unavailable.")).toBeInTheDocument();
  });

  it("renders the shared error state when overview fails", () => {
    overviewState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Overview unavailable"),
      refetch: vi.fn(),
    };

    render(<ReportsScreen />);

    expect(screen.getByText("Overview unavailable")).toBeInTheDocument();
  });
});

function overview(overrides: Partial<WorkspaceOverviewDto> = {}): WorkspaceOverviewDto {
  return {
    workspaceId: "w1",
    from: null,
    to: "2026-06-16T00:00:00.000Z",
    trackedBrands: [{ brandId: "b1", name: "Acme" }],
    competitors: [{ competitorId: "c1", name: "Canva" }],
    scanCount: 4,
    hero: {
      queries: 100,
      mentions: 40,
      citations: 20,
      brandMentionRate: 0.4,
      brandAbsenceRate: 0.35,
      brandFirstMentionRate: 0.2,
    },
    previousHero: null,
    series: [],
    topEntities: [
      {
        entityType: "Brand",
        entityId: "b1",
        name: "Acme",
        isTrackedBrand: true,
        visibility: 0.4,
        visibilityDelta: 0.1,
        shareOfVoice: 0.45,
        shareOfVoiceDelta: 0.05,
        sentiment: "Positive",
        sentimentDelta: 1,
      },
    ],
    topBrandAttributes: [],
    coMentions: [],
    topBrandRiskFlags: [{ rank: 1, flagType: "Accuracy", severity: "High", mentionCount: 3 }],
    topBrandComparisons: [],
    topicOwnership: [
      {
        rank: 1,
        topicName: "AI visibility",
        promptCount: 10,
        brandMentionedPromptCount: 2,
      },
    ],
    recentFactualClaims: [
      {
        claimId: "cl1",
        brandId: "b1",
        brandName: "Acme",
        subject: "pricing",
        assertedValue: "transparent",
        claimText: "Acme has transparent pricing.",
        evidenceSnippet: "Pricing is transparent.",
        verifiability: "Verifiable",
        reviewStatus: "NeedsReview",
        createdAt: "2026-06-01T00:00:00Z",
      },
    ],
    ...overrides,
  };
}

function competitive(): WorkspaceCompetitiveDto {
  return {
    workspaceId: "w1",
    from: null,
    to: "2026-06-16T00:00:00.000Z",
    topDomains: [],
    domainTypes: [],
    mentionDistribution: [
      {
        entityId: "b1",
        name: "Acme",
        entityType: "Brand",
        isTrackedBrand: true,
        mentionCount: 10,
        share: 0.5,
      },
    ],
    competitiveGaps: [],
    recommendationRates: [],
  };
}
