import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceOverviewDto } from "@/types/api";
import { deriveTopicOpportunities } from "@/features/reports/topics";
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
});

describe("TopicsScreen", () => {
  it("renders summary tiles and topic rows", () => {
    render(<TopicsScreen />);

    expect(screen.getByRole("heading", { name: "Topics" })).toBeInTheDocument();
    expect(screen.getByText("Tracked topics")).toBeInTheDocument();
    expect(screen.getByText("Owned topics")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Political news")).toBeInTheDocument();
    expect(screen.getByText("Media credibility")).toBeInTheDocument();
  });

  it("opens a topic drawer from a row", async () => {
    render(<TopicsScreen />);

    await userEvent.click(screen.getByText("Political news"));

    const drawer = screen.getByRole("dialog", { name: "Political news" });
    expect(within(drawer).getByText("Recommended action")).toBeInTheDocument();
    expect(within(drawer).getByText("Why this matters")).toBeInTheDocument();
    expect(within(drawer).getByText("Evidence")).toBeInTheDocument();
  });

  it("renders the empty state when no topics are available", () => {
    overviewState = {
      ...overviewState,
      data: overview({ topicOwnership: [] }),
    };

    render(<TopicsScreen />);

    expect(screen.getByText("No topics yet")).toBeInTheDocument();
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
