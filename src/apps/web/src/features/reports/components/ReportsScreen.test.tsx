import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";
import { deriveReportPackageSummary, sectionsForReportTemplate } from "@/features/reports/reports";
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

describe("sectionsForReportTemplate", () => {
  const allSections = [
    "Executive summary",
    "Visibility scorecards",
    "Lens performance",
    "Recommendations",
    "Competitors",
    "Sources and citations",
    "Topics and content gaps",
    "Claims and risks",
    "Evidence appendix",
  ];

  it("maps focused templates to their report sections", () => {
    expect(sectionsForReportTemplate("Citation authority report", allSections)).toEqual([
      "Executive summary",
      "Recommendations",
      "Sources and citations",
      "Evidence appendix",
    ]);
    expect(sectionsForReportTemplate("Risk review report", allSections)).toEqual([
      "Executive summary",
      "Recommendations",
      "Claims and risks",
      "Evidence appendix",
    ]);
  });

  it("keeps the monthly report as a full report", () => {
    expect(sectionsForReportTemplate("Monthly AI visibility report", allSections)).toEqual(
      allSections,
    );
  });

  it("summarizes report package readiness", () => {
    expect(
      deriveReportPackageSummary([
        { name: "Executive summary", ready: true },
        { name: "Competitors", ready: false },
        { name: "Sources and citations", ready: true },
      ]),
    ).toEqual({
      totalSections: 3,
      readySections: ["Executive summary", "Sources and citations"],
      missingSections: ["Competitors"],
      readinessPercent: 67,
    });
  });
});

describe("ReportsScreen", () => {
  it("renders report readiness from workspace evidence", () => {
    render(<ReportsScreen />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("Reports created")).toBeInTheDocument();
    expect(screen.getByText("Scheduled reports")).toBeInTheDocument();
    expect(screen.getByText("Open client actions")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create report" })).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("Monthly AI visibility report")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Schedule delivery" })).toBeInTheDocument();
    expect(screen.getByText("Report history")).toBeInTheDocument();
  });

  it("updates the report section checklist and preview when a template is selected", async () => {
    render(<ReportsScreen />);

    await userEvent.click(screen.getByRole("button", { name: /citation authority report/i }));

    const createReport = screen.getByRole("region", { name: "Create report" });
    expect(within(createReport).getByText("Sources and citations")).toBeInTheDocument();
    expect(within(createReport).queryByText("Competitors")).not.toBeInTheDocument();

    const preview = screen.getByRole("region", { name: "Report preview" });
    expect(within(preview).getByText("Citation authority report")).toBeInTheDocument();
    expect(within(preview).getByText(/4 sections included/i)).toBeInTheDocument();
    expect(within(preview).getByText("Readiness score")).toBeInTheDocument();
    expect(within(preview).getByText("100%")).toBeInTheDocument();
    expect(within(preview).getByText("Ready sections")).toBeInTheDocument();
    expect(within(preview).getByText("All sections have enough evidence.")).toBeInTheDocument();

    const schedule = screen.getByRole("region", { name: "Schedule delivery" });
    expect(within(schedule).getByText("Citation authority report")).toBeInTheDocument();
    expect(within(schedule).getByText("4/4 sections ready")).toBeInTheDocument();
  });

  it("shows missing sections in the report preview when evidence is incomplete", async () => {
    overviewState = {
      ...overviewState,
      data: overview({
        hero: {
          queries: 100,
          mentions: 40,
          citations: 0,
          brandMentionRate: 0.4,
          brandAbsenceRate: 0.35,
          brandFirstMentionRate: 0.2,
        },
      }),
    };
    render(<ReportsScreen />);

    await userEvent.click(screen.getByRole("button", { name: /citation authority report/i }));

    const preview = screen.getByRole("region", { name: "Report preview" });
    expect(within(preview).getByText("75%")).toBeInTheDocument();
    expect(within(preview).getAllByText("Needs data").length).toBeGreaterThanOrEqual(1);
    expect(within(preview).getByText("Sources and citations")).toBeInTheDocument();
  });

  it("renders planned schedule delivery details", () => {
    render(<ReportsScreen />);

    const schedule = screen.getByRole("region", { name: "Schedule delivery" });

    expect(within(schedule).getByText("Monthly")).toBeInTheDocument();
    expect(within(schedule).getByText("Client stakeholders")).toBeInTheDocument();
    expect(within(schedule).getByText("Planned")).toBeInTheDocument();
    expect(within(schedule).getByRole("button", { name: "Schedule delivery" })).toBeDisabled();
  });

  it("renders the report history columns from the reporting spec", () => {
    render(<ReportsScreen />);

    expect(screen.getByText("Report name")).toBeInTheDocument();
    expect(screen.getByText("Tracker")).toBeInTheDocument();
    expect(screen.getByText("Date range")).toBeInTheDocument();
    expect(screen.getByText("Created by")).toBeInTheDocument();
    expect(screen.getByText("Shared with")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Last opened")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
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
