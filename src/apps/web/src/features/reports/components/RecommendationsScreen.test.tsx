import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";
import {
  deriveQuickWins,
  deriveRecommendationCategory,
  deriveRecommendations,
  summarizeRecommendationCategories,
} from "@/features/reports/recommendations";
import { RecommendationsScreen } from "./RecommendationsScreen";

let overviewState: {
  data?: WorkspaceOverviewDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let competitiveState: {
  data?: WorkspaceCompetitiveDto;
  isLoading: boolean;
  isError: boolean;
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

describe("deriveRecommendations", () => {
  it("creates action items from claims, risks, weak topics, competitor gaps, and hero rates", () => {
    const items = deriveRecommendations(overview(), competitive());

    expect(items.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Review claim about circulation",
        "Address outdated info risk theme",
        "Improve topic visibility for Political news",
        "Close the gap with Rival News",
        "Reduce not-mentioned rate",
        "Improve first-mention prominence",
      ]),
    );
    expect(items[0].priority).toBe(1);
    expect(items.every((item) => item.status === "Open")).toBe(true);
  });

  it("returns an empty queue when there is no actionable evidence", () => {
    const items = deriveRecommendations(
      overview({
        hero: {
          queries: 20,
          mentions: 10,
          citations: 5,
          brandMentionRate: 0.8,
          brandAbsenceRate: 0.1,
          brandFirstMentionRate: 0.7,
        },
        recentFactualClaims: [],
        topBrandRiskFlags: [],
        topicOwnership: [],
      }),
      competitive({ competitiveGaps: [] }),
    );

    expect(items).toEqual([]);
  });

  it("derives and summarizes action categories", () => {
    const items = deriveRecommendations(overview(), competitive());

    expect(
      deriveRecommendationCategory(items.find((item) => item.lens === "Claims & Risks")!),
    ).toBe("Claim correction");
    expect(summarizeRecommendationCategories(items).map((summary) => summary.category)).toEqual(
      expect.arrayContaining([
        "Claim correction",
        "Competitive positioning",
        "New content opportunity",
        "Trust signal improvement",
      ]),
    );
  });

  it("derives quick wins from open low-effort medium or high impact items", () => {
    const items = deriveRecommendations(overview(), competitive());

    expect(deriveQuickWins(items).map((item) => item.title)).toEqual([
      "Review claim about circulation",
    ]);
    expect(deriveQuickWins(items.map((item) => ({ ...item, status: "Done" as const })))).toEqual(
      [],
    );
  });
});

describe("RecommendationsScreen", () => {
  it("renders the workbench header, summary tiles, and recommendation rows", () => {
    render(<RecommendationsScreen />);

    expect(screen.getByRole("heading", { name: "Recommendations" })).toBeInTheDocument();
    expect(screen.getByText("Open recommendations")).toBeInTheDocument();
    expect(screen.getByText("High impact")).toBeInTheDocument();
    expect(screen.getByText("Action categories")).toBeInTheDocument();
    expect(screen.getByText("Competitive positioning")).toBeInTheDocument();
    expect(screen.getByText("Quick wins")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("Review claim about circulation"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("Close the gap with Rival News"),
    ).toBeInTheDocument();
  });

  it("opens a details drawer from a row", async () => {
    render(<RecommendationsScreen />);

    await userEvent.click(
      within(screen.getByRole("table")).getByText("Review claim about circulation"),
    );

    const drawer = screen.getByRole("dialog", { name: /review claim about circulation/i });
    expect(within(drawer).getByText("Why this matters")).toBeInTheDocument();
    expect(within(drawer).getByText("Suggested implementation")).toBeInTheDocument();
    expect(within(drawer).getByText("Evidence")).toBeInTheDocument();
  });

  it("opens and plans quick wins from the card section", async () => {
    render(<RecommendationsScreen />);

    const quickWins = screen.getByRole("region", { name: "Quick wins" });

    await userEvent.click(within(quickWins).getByRole("button", { name: "View quick win" }));

    expect(
      screen.getByRole("dialog", { name: /review claim about circulation/i }),
    ).toBeInTheDocument();

    await userEvent.click(within(quickWins).getByRole("button", { name: "Mark planned" }));
    await userEvent.click(screen.getByRole("button", { name: "Planned" }));

    expect(
      within(screen.getByRole("table")).getByText("Review claim about circulation"),
    ).toBeInTheDocument();
  });

  it("filters the action queue by impact and lens", async () => {
    render(<RecommendationsScreen />);

    await userEvent.click(screen.getByRole("button", { name: "High" }));

    expect(screen.getByText("Close the gap with Rival News")).toBeInTheDocument();
    expect(screen.queryByText("Review claim about circulation")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "All impacts" }));
    await userEvent.click(screen.getByRole("button", { name: "Claims & Risks" }));

    expect(
      within(screen.getByRole("table")).getByText("Review claim about circulation"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).queryByText("Close the gap with Rival News"),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(
      within(screen.getByRole("table")).getByText("Review claim about circulation"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("Close the gap with Rival News"),
    ).toBeInTheDocument();
  });

  it("updates recommendation status locally and filters by status", async () => {
    render(<RecommendationsScreen />);

    await userEvent.click(
      within(screen.getByRole("table")).getByText("Review claim about circulation"),
    );
    const drawer = screen.getByRole("dialog", { name: /review claim about circulation/i });

    await userEvent.click(within(drawer).getByRole("button", { name: "Mark as planned" }));

    expect(within(drawer).getByText("Planned")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Planned" }));

    expect(
      within(screen.getByRole("table")).getByText("Review claim about circulation"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).queryByText("Close the gap with Rival News"),
    ).not.toBeInTheDocument();

    await userEvent.click(within(drawer).getByRole("button", { name: "Mark done" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(
      within(screen.getByRole("table")).getByText("Review claim about circulation"),
    ).toBeInTheDocument();
    expect(within(drawer).getByText("Done")).toBeInTheDocument();
  });

  it("renders the empty state when no recommendations are derived", () => {
    overviewState = {
      ...overviewState,
      data: overview({
        hero: {
          queries: 20,
          mentions: 10,
          citations: 5,
          brandMentionRate: 0.8,
          brandAbsenceRate: 0.1,
          brandFirstMentionRate: 0.7,
        },
        recentFactualClaims: [],
        topBrandRiskFlags: [],
        topicOwnership: [],
      }),
    };
    competitiveState = { ...competitiveState, data: competitive({ competitiveGaps: [] }) };

    render(<RecommendationsScreen />);

    expect(screen.getByText("No recommendations yet")).toBeInTheDocument();
  });
});

function overview(overrides: Partial<WorkspaceOverviewDto> = {}): WorkspaceOverviewDto {
  return {
    workspaceId: "w1",
    from: null,
    to: "2026-06-16T00:00:00.000Z",
    trackedBrands: [{ brandId: "b1", name: "India Today" }],
    competitors: [{ competitorId: "c1", name: "Rival News" }],
    scanCount: 3,
    hero: {
      queries: 100,
      mentions: 20,
      citations: 10,
      brandMentionRate: 0.2,
      brandAbsenceRate: 0.45,
      brandFirstMentionRate: 0.12,
    },
    previousHero: null,
    series: [],
    topEntities: [],
    topBrandAttributes: [],
    coMentions: [],
    topBrandRiskFlags: [{ rank: 1, flagType: "outdated_info", severity: "High", mentionCount: 12 }],
    topBrandComparisons: [],
    topicOwnership: [
      {
        rank: 1,
        topicName: "Political news",
        promptCount: 8,
        brandMentionedPromptCount: 2,
      },
    ],
    recentFactualClaims: [
      {
        claimId: "cl1",
        brandId: "b1",
        brandName: "India Today",
        subject: "circulation",
        assertedValue: "largest",
        claimText: "India Today is the largest news magazine by circulation.",
        evidenceSnippet: "AI answer cited circulation leadership.",
        verifiability: "Verifiable",
        reviewStatus: "Pending",
        createdAt: "2026-06-15T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function competitive(overrides: Partial<WorkspaceCompetitiveDto> = {}): WorkspaceCompetitiveDto {
  return {
    workspaceId: "w1",
    from: null,
    to: "2026-06-16T00:00:00.000Z",
    topDomains: [],
    domainTypes: [],
    mentionDistribution: [],
    recommendationRates: [],
    competitiveGaps: [
      {
        trackedBrandId: "b1",
        trackedBrandName: "India Today",
        gaps: [
          {
            competitorId: "c1",
            competitorName: "Rival News",
            brandMentions: 5,
            competitorMentions: 11,
            mentionsGap: -6,
            brandRecommendations: 2,
            competitorRecommendations: 4,
            recommendationsGap: -2,
          },
        ],
      },
    ],
    ...overrides,
  };
}
