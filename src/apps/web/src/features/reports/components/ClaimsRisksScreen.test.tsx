import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceOverviewDto } from "@/types/api";
import {
  countClaimsByStatus,
  countClaimsByType,
  countRisksBySeverity,
  deriveClaimRecommendedAction,
  deriveClaimsRisksSummary,
  deriveClaimsRisksSummaryFromRows,
  deriveReviewWorkflowClaims,
  filterClaimsByStatus,
  filterClaimsByType,
  filterRisksBySeverity,
} from "@/features/reports/claimsRisks";
import { ClaimsRisksScreen } from "./ClaimsRisksScreen";

let overviewState: {
  data?: WorkspaceOverviewDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let updateMutate: ReturnType<typeof vi.fn>;
let updateState: {
  isPending: boolean;
  error?: unknown;
  variables?: { claimId: string; reviewStatus: string };
};
const originalCreateElement = document.createElement.bind(document);
let anchorClick: ReturnType<typeof vi.fn>;

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => ({ scope: "all" }),
}));

vi.mock("@/features/reports/hooks/useWorkspaceOverview", () => ({
  useWorkspaceOverview: () => overviewState,
}));

vi.mock("@/features/reports/hooks/useUpdateFactualClaimReviewStatus", () => ({
  useUpdateFactualClaimReviewStatus: () => ({
    mutate: updateMutate,
    ...updateState,
  }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  overviewState = {
    data: overview(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
  updateMutate = vi.fn();
  updateState = { isPending: false };
  anchorClick = vi.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:claims-risks-report"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
    const element = originalCreateElement(tagName, options);
    if (tagName.toLowerCase() === "a") {
      Object.defineProperty(element, "click", { configurable: true, value: anchorClick });
    }
    return element;
  });
});

describe("deriveClaimsRisksSummary", () => {
  it("counts pending, disputed, and high-severity risk items", () => {
    const data = overview();
    expect(deriveClaimsRisksSummary(data)).toEqual({
      claimsToReview: 1,
      disputedClaims: 1,
      highSeverity: 1,
      openRisks: 4,
    });
    expect(
      deriveClaimsRisksSummaryFromRows(data.recentFactualClaims, data.topBrandRiskFlags),
    ).toEqual({
      claimsToReview: 1,
      disputedClaims: 1,
      highSeverity: 1,
      openRisks: 4,
    });
  });
});

describe("claim and risk filters", () => {
  it("filters and counts claims by review status", () => {
    const claims = overview().recentFactualClaims;
    expect(countClaimsByStatus(claims)).toEqual({
      Pending: 1,
      Verified: 0,
      Disputed: 1,
    });
    expect(filterClaimsByStatus(claims, "Disputed").map((claim) => claim.claimId)).toEqual([
      "claim-2",
    ]);
    expect(filterClaimsByStatus(claims, null)).toHaveLength(2);
  });

  it("filters and counts claims by claim type", () => {
    const claims = overview().recentFactualClaims;
    expect(countClaimsByType(claims)).toEqual({
      Subjective: 1,
      Verifiable: 1,
    });
    expect(filterClaimsByType(claims, "Subjective").map((claim) => claim.claimId)).toEqual([
      "claim-2",
    ]);
    expect(filterClaimsByType(claims, null)).toHaveLength(2);
  });

  it("filters and counts risks by severity", () => {
    const risks = overview().topBrandRiskFlags;
    expect(countRisksBySeverity(risks)).toEqual({ High: 1, Medium: 1, Low: 0 });
    expect(filterRisksBySeverity(risks, "High").map((risk) => risk.flagType)).toEqual([
      "outdated_info",
    ]);
    expect(filterRisksBySeverity(risks, null)).toHaveLength(2);
  });

  it("derives claim actions and workflow priority", () => {
    const claims = overview().recentFactualClaims;

    expect(claims.map((claim) => deriveClaimRecommendedAction(claim))).toEqual([
      "Verify against source",
      "Correct or add context",
    ]);
    expect(deriveReviewWorkflowClaims(claims).map((claim) => claim.claimId)).toEqual([
      "claim-2",
      "claim-1",
    ]);
  });
});

describe("ClaimsRisksScreen", () => {
  it("renders summary tiles, claims table, risk themes, and known-for themes", () => {
    render(<ClaimsRisksScreen />);

    expect(screen.getByRole("heading", { name: "Claims & Risks" })).toBeInTheDocument();
    expect(screen.getByText("Open risks")).toBeInTheDocument();
    expect(screen.getByText("Claims AI makes about you")).toBeInTheDocument();
    expect(screen.getByText("Recommended action")).toBeInTheDocument();
    expect(screen.getByText("Priority review queue")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("India Today is the largest news magazine."),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("Verify against source"),
    ).toBeInTheDocument();
    expect(screen.getByText("outdated info")).toBeInTheDocument();
    expect(screen.getByText("credible")).toBeInTheDocument();
  });

  it("creates a filtered claims and risks report package", async () => {
    render(<ClaimsRisksScreen />);

    await userEvent.click(screen.getByRole("button", { name: /disputed\s+1/i }));
    await userEvent.click(screen.getByRole("button", { name: /high\s+1/i }));
    await userEvent.click(screen.getByRole("button", { name: "Create report" }));

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Report created" })).toBeDisabled();
    expect(
      screen.getByText("Claims & risks report created with 1 claims and 1 risk themes."),
    ).toBeInTheDocument();
  });

  it("opens a claim review drawer and submits status changes", async () => {
    render(<ClaimsRisksScreen />);

    await userEvent.click(
      within(screen.getByRole("table")).getByText("India Today is the largest news magazine."),
    );

    const drawer = screen.getByRole("dialog", {
      name: /india today is the largest news magazine/i,
    });
    expect(within(drawer).getByText("Evidence")).toBeInTheDocument();
    expect(within(drawer).getByText("circulation leadership snippet")).toBeInTheDocument();

    await userEvent.click(within(drawer).getByRole("button", { name: /mark verified/i }));

    expect(updateMutate).toHaveBeenCalledWith({
      claimId: "claim-1",
      reviewStatus: "Verified",
    });
  });

  it("opens a claim review drawer from the workflow queue", async () => {
    render(<ClaimsRisksScreen />);

    const queue = screen.getByRole("region", { name: "Priority review queue" });
    expect(within(queue).getByText("Correct or add context")).toBeInTheDocument();

    await userEvent.click(within(queue).getAllByRole("button", { name: "Open review" })[0]);

    expect(
      screen.getByRole("dialog", { name: /india today is owned by an incorrect entity/i }),
    ).toBeInTheDocument();
  });

  it("renders the empty state when there are no claims", () => {
    overviewState = {
      ...overviewState,
      data: overview({ recentFactualClaims: [], topBrandRiskFlags: [], topBrandAttributes: [] }),
    };

    render(<ClaimsRisksScreen />);

    expect(screen.getByText("No claims or risks yet")).toBeInTheDocument();
    expect(screen.getByText("No risk themes detected in this period.")).toBeInTheDocument();
    expect(screen.getByText("No known-for themes detected in this period.")).toBeInTheDocument();
  });

  it("filters claims by status and risk themes by severity", async () => {
    render(<ClaimsRisksScreen />);

    await userEvent.click(screen.getByRole("button", { name: /disputed\s+1/i }));

    const table = screen.getByRole("table");
    expect(
      within(table).queryByText("India Today is the largest news magazine."),
    ).not.toBeInTheDocument();
    expect(
      within(table).getByText("India Today is owned by an incorrect entity."),
    ).toBeInTheDocument();
    expect(screen.getByText("Open risks")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /high\s+1/i }));

    expect(screen.getByText("outdated info")).toBeInTheDocument();
    expect(screen.queryByText("brand confusion")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(
      within(screen.getByRole("table")).getByText("India Today is the largest news magazine."),
    ).toBeInTheDocument();
    expect(screen.getByText("brand confusion")).toBeInTheDocument();
  });

  it("filters claims by claim type", async () => {
    render(<ClaimsRisksScreen />);

    await userEvent.click(screen.getByRole("button", { name: /subjective\s+1/i }));

    const table = screen.getByRole("table");
    expect(
      within(table).queryByText("India Today is the largest news magazine."),
    ).not.toBeInTheDocument();
    expect(
      within(table).getByText("India Today is owned by an incorrect entity."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(
      within(screen.getByRole("table")).getByText("India Today is the largest news magazine."),
    ).toBeInTheDocument();
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
    coMentions: [],
    topBrandComparisons: [],
    topicOwnership: [],
    topBrandAttributes: [{ rank: 1, name: "credible", polarity: "Positive", mentionCount: 12 }],
    topBrandRiskFlags: [
      { rank: 1, flagType: "outdated_info", severity: "High", mentionCount: 8 },
      { rank: 2, flagType: "brand_confusion", severity: "Medium", mentionCount: 4 },
    ],
    recentFactualClaims: [
      {
        claimId: "claim-1",
        brandId: "b1",
        brandName: "India Today",
        subject: "circulation",
        assertedValue: "largest",
        claimText: "India Today is the largest news magazine.",
        evidenceSnippet: "circulation leadership snippet",
        verifiability: "Verifiable",
        reviewStatus: "Pending",
        createdAt: "2026-06-15T00:00:00.000Z",
      },
      {
        claimId: "claim-2",
        brandId: "b1",
        brandName: "India Today",
        subject: "ownership",
        assertedValue: "unknown",
        claimText: "India Today is owned by an incorrect entity.",
        evidenceSnippet: "ownership snippet",
        verifiability: "Subjective",
        reviewStatus: "Disputed",
        createdAt: "2026-06-14T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}
