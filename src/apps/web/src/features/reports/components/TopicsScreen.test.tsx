import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceOverviewDto } from "@/types/api";
import {
  countTopicsByAction,
  countTopicsByBand,
  deriveCompetitiveTopicRisks,
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

let objectUrlSpy: ReturnType<typeof vi.fn>;
let revokeUrlSpy: ReturnType<typeof vi.fn>;

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
  objectUrlSpy = vi.fn(() => "blob:topic-brief");
  revokeUrlSpy = vi.fn();
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: objectUrlSpy,
    revokeObjectURL: revokeUrlSpy,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
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

  it("derives competitive topic risks from weak and gap topics", () => {
    const rows = deriveTopicOpportunities(overview());

    expect(deriveCompetitiveTopicRisks(rows)).toEqual([
      expect.objectContaining({
        topicName: "Political news",
        riskLevel: "High",
        gapRate: 1,
        recommendedAction: "Create coverage",
      }),
      expect.objectContaining({
        topicName: "Election analysis",
        riskLevel: "Medium",
        gapRate: 0.5,
        recommendedAction: "Build authority",
      }),
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
    expect(screen.getByRole("region", { name: "Competitive risk topics" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Content opportunities" })).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(2);
    const table = getTopicTable();
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("Political news")).toBeInTheDocument();
    expect(within(table).getByText("Media credibility")).toBeInTheDocument();
  });

  it("opens a topic drawer from a row", async () => {
    render(<TopicsScreen />);

    await userEvent.click(within(getTopicTable()).getByText("Political news"));

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
    expect(within(drawer).getByRole("button", { name: "Add to report" })).toBeEnabled();
    expect(within(drawer).getByRole("button", { name: "Create content brief" })).toBeEnabled();
  });

  it("exports the filtered topic brief package", async () => {
    render(<TopicsScreen />);

    await userEvent.click(screen.getByRole("button", { name: /gap\s+1/i }));
    await userEvent.click(screen.getByRole("button", { name: "Export brief" }));

    expect(objectUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith("blob:topic-brief");
    expect(screen.getByText("Topic brief exported with 1 topics.")).toBeInTheDocument();
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

    const table = getTopicTable();
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
    ).toBeEnabled();

    await userEvent.click(
      within(firstOpportunity).getByRole("button", { name: "Create recommendation" }),
    );

    expect(screen.getByRole("dialog", { name: "Political news" })).toBeInTheDocument();
  });

  it("generates a content brief from an opportunity card", async () => {
    render(<TopicsScreen />);

    const opportunities = screen.getByRole("region", { name: "Content opportunities" });
    const firstOpportunity = within(opportunities)
      .getByText("Political news")
      .closest("div[class*='min-h-40']") as HTMLElement;

    await userEvent.click(
      within(firstOpportunity).getByRole("button", { name: "Generate content brief" }),
    );

    expect(objectUrlSpy).toHaveBeenCalled();
    expect(
      within(firstOpportunity).getByRole("button", { name: "Brief generated" }),
    ).toBeDisabled();
    expect(screen.getByText("Content brief generated for Political news.")).toBeInTheDocument();
  });

  it("adds a competitive risk topic to the report and creates a recovery plan", async () => {
    render(<TopicsScreen />);

    const risks = screen.getByRole("region", { name: "Competitive risk topics" });
    const politicalNewsRow = within(risks)
      .getByText("Political news")
      .closest("tr") as HTMLTableRowElement;

    await userEvent.click(within(politicalNewsRow).getByRole("button", { name: "Add to report" }));

    expect(
      within(politicalNewsRow).getByRole("button", { name: "Added to report" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Political news was added to the competitive topic report."),
    ).toBeInTheDocument();

    await userEvent.click(
      within(politicalNewsRow).getByRole("button", { name: "Create recovery plan" }),
    );

    expect(objectUrlSpy).toHaveBeenCalled();
    expect(within(politicalNewsRow).getByRole("button", { name: "Plan created" })).toBeDisabled();
    expect(screen.getByText("Recovery plan created for Political news.")).toBeInTheDocument();
  });

  it("adds a drawer topic to the report queue", async () => {
    render(<TopicsScreen />);

    await userEvent.click(within(getTopicTable()).getByText("Political news"));
    const drawer = screen.getByRole("dialog", { name: "Political news" });

    await userEvent.click(within(drawer).getByRole("button", { name: "Add to report" }));

    expect(within(drawer).getByRole("button", { name: "Added to report" })).toBeDisabled();
    expect(screen.getByText("Political news was added to the topic report.")).toBeInTheDocument();
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

function getTopicTable() {
  const [table] = screen.getAllByRole("table");
  if (!table) throw new Error("Expected primary topic table to render.");
  return table;
}
