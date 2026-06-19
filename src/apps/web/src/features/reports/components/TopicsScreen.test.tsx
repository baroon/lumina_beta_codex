import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceOverviewDto } from "@/types/api";
import {
  countTopicsByAction,
  countTopicsByBand,
  deriveContentOpportunityTopics,
  deriveTopicRecommendationPreview,
  deriveTopicOpportunities,
  filterTopicOpportunities,
} from "@/features/reports/topics";
import { TopicsScreen } from "./TopicsScreen";

let overviewState: {
  data?: WorkspaceOverviewDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => ({ scope: "all" }),
}));

vi.mock("@/features/reports/hooks/useWorkspaceOverview", () => ({
  useWorkspaceOverview: () => overviewState,
}));

beforeEach(() => {
  overviewState = {
    data: overview(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
});

describe("deriveTopicOpportunities", () => {
  it("prioritizes gaps before contested and owned topics", () => {
    const rows = deriveTopicOpportunities(overview());

    expect(rows.map((row) => row.topicName)).toEqual([
      "Political news",
      "Election analysis",
      "Media credibility",
    ]);
    expect(rows[0]).toMatchObject({
      band: "Gap",
      action: "Create coverage",
      missedPromptCount: 6,
    });
  });

  it("filters and counts topics by ownership band and recommended action", () => {
    const rows = deriveTopicOpportunities(overview());

    expect(countTopicsByBand(rows)).toEqual({ Gap: 1, Contested: 1, Owned: 1 });
    expect(countTopicsByAction(rows)).toEqual({
      Defend: 1,
      "Build authority": 1,
      "Create coverage": 1,
    });
    expect(filterTopicOpportunities(rows, "Gap", null).map((row) => row.topicName)).toEqual([
      "Political news",
    ]);
    expect(
      filterTopicOpportunities(rows, null, "Build authority").map((row) => row.topicName),
    ).toEqual(["Election analysis"]);
  });

  it("derives content opportunities from non-defended topics by missed question volume", () => {
    const rows = deriveTopicOpportunities(overview());

    expect(deriveContentOpportunityTopics(rows).map((row) => row.topicName)).toEqual([
      "Political news",
      "Election analysis",
    ]);
  });

  it("derives a recommendation preview from the recommended topic action", () => {
    const [gap, contested, owned] = deriveTopicOpportunities(overview());

    expect(deriveTopicRecommendationPreview(gap)).toMatchObject({
      title: "Create coverage for Political news",
      priority: "High",
    });
    expect(deriveTopicRecommendationPreview(contested)).toMatchObject({
      title: "Strengthen authority for Election analysis",
      priority: "Medium",
    });
    expect(deriveTopicRecommendationPreview(owned)).toMatchObject({
      title: "Defend coverage for Media credibility",
      priority: "Low",
    });
  });
});

describe("TopicsScreen", () => {
  it("renders summary tiles and topic rows", () => {
    render(<TopicsScreen />);

    expect(screen.getByRole("heading", { name: "Topics" })).toBeInTheDocument();
    expect(screen.getByText("Topics tracked")).toBeInTheDocument();
    expect(screen.getByText("Strong topics")).toBeInTheDocument();
    expect(screen.getByText("Weak topics")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Content opportunities" })).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(2);
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("Political news")).toBeInTheDocument();
    expect(within(table).getByText("Media credibility")).toBeInTheDocument();
  });

  it("opens a topic drawer from a row", async () => {
    render(<TopicsScreen />);

    await userEvent.click(within(screen.getByRole("table")).getByText("Political news"));

    const drawer = screen.getByRole("dialog", { name: "Political news" });
    expect(within(drawer).getByText("Recommended action")).toBeInTheDocument();
    expect(within(drawer).getByText("Why this matters")).toBeInTheDocument();
    expect(within(drawer).getByText("Recommendation preview")).toBeInTheDocument();
    expect(within(drawer).getByText("Create coverage for Political news")).toBeInTheDocument();
    expect(within(drawer).getByText("Priority: High")).toBeInTheDocument();
    expect(
      within(drawer).getByText(/publish or update a page that directly answers/i),
    ).toBeInTheDocument();
    expect(within(drawer).getByText("Evidence")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Add to report" })).toBeDisabled();
    expect(within(drawer).getByRole("button", { name: "Create content brief" })).toBeDisabled();
  });

  it("renders the empty state when no topics are available", () => {
    overviewState = {
      ...overviewState,
      data: overview({ topicOwnership: [] }),
    };

    render(<TopicsScreen />);

    expect(screen.getByText("No topics yet")).toBeInTheDocument();
  });

  it("filters topics by ownership and recommended action", async () => {
    render(<TopicsScreen />);

    await userEvent.click(screen.getByRole("button", { name: /gap\s+1/i }));

    const table = screen.getByRole("table");
    expect(within(table).getByText("Political news")).toBeInTheDocument();
    expect(within(table).queryByText("Election analysis")).not.toBeInTheDocument();
    expect(within(table).queryByText("Media credibility")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    await userEvent.click(screen.getByRole("button", { name: /build authority\s+1/i }));

    expect(within(table).getByText("Election analysis")).toBeInTheDocument();
    expect(within(table).queryByText("Political news")).not.toBeInTheDocument();
  });

  it("opens topic details from a content opportunity card", async () => {
    render(<TopicsScreen />);

    const opportunities = screen.getByRole("region", { name: "Content opportunities" });
    const firstOpportunity = within(opportunities)
      .getByText("Political news")
      .closest("div[class*='min-h-40']") as HTMLElement;
    expect(within(opportunities).getByText("6 missed AI questions")).toBeInTheDocument();
    expect(
      within(firstOpportunity).getByRole("button", { name: "Generate content brief" }),
    ).toBeDisabled();

    await userEvent.click(
      within(firstOpportunity).getByRole("button", { name: "Create recommendation" }),
    );

    expect(screen.getByRole("dialog", { name: "Political news" })).toBeInTheDocument();
  });
});

function overview(overrides: Partial<WorkspaceOverviewDto> = {}): WorkspaceOverviewDto {
  return {
    workspaceId: "w1",
    from: null,
    to: "2026-06-16T00:00:00.000Z",
    trackedBrands: [{ brandId: "b1", name: "India Today" }],
    competitors: [],
    scanCount: 4,
    hero: {
      queries: 100,
      mentions: 40,
      citations: 20,
      brandMentionRate: 0.4,
      brandAbsenceRate: 0.25,
      brandFirstMentionRate: 0.2,
    },
    previousHero: null,
    series: [],
    topEntities: [],
    topBrandAttributes: [],
    coMentions: [],
    topBrandRiskFlags: [],
    topBrandComparisons: [],
    topicOwnership: [
      {
        rank: 1,
        topicName: "Media credibility",
        promptCount: 10,
        brandMentionedPromptCount: 8,
      },
      {
        rank: 2,
        topicName: "Election analysis",
        promptCount: 8,
        brandMentionedPromptCount: 4,
      },
      {
        rank: 3,
        topicName: "Political news",
        promptCount: 6,
        brandMentionedPromptCount: 0,
      },
    ],
    recentFactualClaims: [],
    ...overrides,
  };
}
