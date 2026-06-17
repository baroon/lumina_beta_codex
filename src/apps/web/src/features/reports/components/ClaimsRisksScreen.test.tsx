import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceOverviewDto } from "@/types/api";
import { deriveClaimsRisksSummary } from "@/features/reports/claimsRisks";
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
  overviewState = {
    data: overview(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
  updateMutate = vi.fn();
  updateState = { isPending: false };
});

describe("deriveClaimsRisksSummary", () => {
  it("counts pending, disputed, and high-severity risk items", () => {
    expect(deriveClaimsRisksSummary(overview())).toEqual({
      claimsToReview: 1,
      disputedClaims: 1,
      highSeverity: 1,
      openRisks: 4,
    });
  });
});

describe("ClaimsRisksScreen", () => {
  it("renders summary tiles, claims table, risk themes, and known-for themes", () => {
    render(<ClaimsRisksScreen />);

    expect(screen.getByRole("heading", { name: "Claims & Risks" })).toBeInTheDocument();
    expect(screen.getByText("Open risks")).toBeInTheDocument();
    expect(screen.getByText("Claims AI makes about you")).toBeInTheDocument();
    expect(screen.getByText("India Today is the largest news magazine.")).toBeInTheDocument();
    expect(screen.getByText("outdated info")).toBeInTheDocument();
    expect(screen.getByText("credible")).toBeInTheDocument();
  });

  it("opens a claim review drawer and submits status changes", async () => {
    render(<ClaimsRisksScreen />);

    await userEvent.click(screen.getByText("India Today is the largest news magazine."));

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
        verifiability: "Verifiable",
        reviewStatus: "Disputed",
        createdAt: "2026-06-14T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}
