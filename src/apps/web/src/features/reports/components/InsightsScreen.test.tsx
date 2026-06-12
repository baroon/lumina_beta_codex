import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  InsightsNarrativeDto,
  WorkspaceOverviewDto,
  WorkspaceTopEntityRowDto,
} from "@/types/api";

let scopeState: { scope: "all" | string[] };
let overviewState: {
  data?: WorkspaceOverviewDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};
let narrativeMutate: ReturnType<typeof vi.fn>;
let narrativeState: {
  data?: InsightsNarrativeDto;
  isPending: boolean;
  isError: boolean;
  error?: Error;
} = { isPending: false, isError: false };

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => scopeState,
}));
vi.mock("@/features/reports/hooks/useWorkspaceOverview", () => ({
  useWorkspaceOverview: () => ({ ...overviewState, refetch: vi.fn() }),
}));
vi.mock("@/features/reports/hooks/useInsightsNarrative", () => ({
  useGenerateInsightsNarrative: () => ({ mutate: narrativeMutate, ...narrativeState }),
}));

import { InsightsScreen } from "./InsightsScreen";

function row(overrides: Partial<WorkspaceTopEntityRowDto>): WorkspaceTopEntityRowDto {
  return {
    entityType: "Brand",
    entityId: "x",
    name: "X",
    isTrackedBrand: false,
    visibility: 0.5,
    visibilityDelta: 0,
    shareOfVoice: 0.5,
    shareOfVoiceDelta: 0,
    sentiment: null,
    sentimentDelta: null,
    ...overrides,
  };
}

function overview(topEntities: WorkspaceTopEntityRowDto[]): WorkspaceOverviewDto {
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
    topEntities,
    topBrandAttributes: [],
    coMentions: [],
    topBrandRiskFlags: [],
    topBrandComparisons: [],
    topicOwnership: [],
    recentFactualClaims: [],
  };
}

beforeEach(() => {
  scopeState = { scope: "all" };
  overviewState = { data: overview([]), isLoading: false, isError: false };
  narrativeMutate = vi.fn();
  narrativeState = { isPending: false, isError: false };
});

const withData = () => {
  overviewState = {
    data: overview([
      row({ entityId: "leader", name: "Canva", visibility: 0.8 }),
      row({ entityId: "tracked", name: "Acme", isTrackedBrand: true, visibility: 0.5 }),
    ]),
    isLoading: false,
    isError: false,
  };
};

describe("InsightsScreen", () => {
  it("renders the page header with a Beta badge", () => {
    render(<InsightsScreen />);
    expect(screen.getByRole("heading", { name: /Insights/i })).toBeInTheDocument();
    expect(screen.getByText(/^beta$/i)).toBeInTheDocument();
  });

  it("renders a fallback hint when no entities are in scope", () => {
    render(<InsightsScreen />);
    expect(screen.getByText(/run a scan to start generating insights/i)).toBeInTheDocument();
  });

  it("templated narrative ranks the tracked brand against the leader", () => {
    overviewState = {
      data: overview([
        row({ entityId: "leader", name: "Canva", visibility: 0.8 }),
        row({ entityId: "tracked", name: "Acme", isTrackedBrand: true, visibility: 0.5 }),
        row({ entityId: "third", name: "Zety", visibility: 0.3 }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<InsightsScreen />);
    expect(screen.getByText(/Acme ranks #2 of 3 with 50%/i)).toBeInTheDocument();
    expect(screen.getByText(/trailing Canva by 30 pp/i)).toBeInTheDocument();
    expect(screen.getByText(/Canva leads the field with 80%/i)).toBeInTheDocument();
  });

  it("templated narrative celebrates the tracked brand when it leads", () => {
    overviewState = {
      data: overview([
        row({ entityId: "tracked", name: "Acme", isTrackedBrand: true, visibility: 0.6 }),
        row({ entityId: "second", name: "Zety", visibility: 0.4 }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<InsightsScreen />);
    expect(screen.getByText(/Acme leads the field with 60%/i)).toBeInTheDocument();
  });

  it("renders one ranking row per entity with the tracked brand flagged 'You'", () => {
    overviewState = {
      data: overview([
        row({ entityId: "leader", name: "Canva", visibility: 0.8 }),
        row({ entityId: "tracked", name: "Acme", isTrackedBrand: true, visibility: 0.5 }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<InsightsScreen />);
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("Canva");
    expect(table).toHaveTextContent("Acme");
    expect(table).toHaveTextContent("You");
  });

  it("renders entities sorted by visibility descending", () => {
    overviewState = {
      data: overview([
        // Intentionally unsorted to verify the screen sorts.
        row({ entityId: "low", name: "Low", visibility: 0.2 }),
        row({ entityId: "high", name: "High", visibility: 0.9 }),
        row({ entityId: "mid", name: "Mid", visibility: 0.5 }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<InsightsScreen />);
    const rows = screen.getAllByRole("row");
    // First row is the thead; data rows start at index 1.
    expect(rows[1]).toHaveTextContent("High");
    expect(rows[2]).toHaveTextContent("Mid");
    expect(rows[3]).toHaveTextContent("Low");
  });

  // -------------------------------------------------------------------
  // Signal highlights — one bullet per measurement-model field
  // -------------------------------------------------------------------

  it("does not render any highlight bullets when no signals have data", () => {
    overviewState = {
      data: overview([
        row({ entityId: "leader", name: "Canva", visibility: 0.8 }),
        row({ entityId: "tracked", name: "Acme", isTrackedBrand: true, visibility: 0.5 }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<InsightsScreen />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders one bullet per measurement-model signal that has data", () => {
    overviewState = {
      data: {
        ...overview([
          row({ entityId: "leader", name: "Canva", visibility: 0.8 }),
          row({ entityId: "tracked", name: "Acme", isTrackedBrand: true, visibility: 0.5 }),
        ]),
        hero: {
          queries: 100,
          mentions: 60,
          citations: 15,
          brandMentionRate: 0.5,
          brandAbsenceRate: 0.4,
          brandFirstMentionRate: 0.3,
        },
        topBrandAttributes: [
          { rank: 1, name: "trustworthy", polarity: "Positive", mentionCount: 8 },
          { rank: 2, name: "slow", polarity: "Negative", mentionCount: 3 },
        ],
        topBrandRiskFlags: [
          { rank: 1, flagType: "layoffs", severity: "High", mentionCount: 3 },
          { rank: 2, flagType: "outage", severity: "Medium", mentionCount: 1 },
        ],
        topBrandComparisons: [
          { rank: 1, aspect: "price", winCount: 4, lossCount: 1 },
          { rank: 2, aspect: "support_quality", winCount: 0, lossCount: 3 },
        ],
        topicOwnership: [
          {
            rank: 1,
            topicName: "Career advice",
            promptCount: 10,
            brandMentionedPromptCount: 8,
          },
          {
            rank: 2,
            topicName: "Industry news",
            promptCount: 6,
            brandMentionedPromptCount: 1,
          },
        ],
        recentFactualClaims: [
          {
            claimId: "c1",
            brandId: "b1",
            brandName: "Acme",
            subject: "founding_year",
            assertedValue: "1975",
            claimText: "Founded in 1975.",
            evidenceSnippet: "Founded in 1975.",
            verifiability: "Verifiable",
            reviewStatus: "Disputed",
            createdAt: "2026-05-01T00:00:00Z",
          },
        ],
      },
      isLoading: false,
      isError: false,
    };
    render(<InsightsScreen />);
    expect(screen.getByText(/absent from 40% of in-scope answers/i)).toBeInTheDocument();
    expect(screen.getByText(/AI describes your brand as/i)).toBeInTheDocument();
    // 3 (layoffs) + 1 (outage) = 4 risk-flag mentions in scope.
    expect(screen.getByText(/4 risk flags raised/i)).toBeInTheDocument();
    expect(screen.getByText(/win on price, lose on support_quality/i)).toBeInTheDocument();
    expect(screen.getByText(/own "Career advice" \(80%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/lose "Industry news" \(17%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1 disputed/i)).toBeInTheDocument();
  });

  it("absence rate below 25% is skipped (reads as noise)", () => {
    overviewState = {
      data: {
        ...overview([
          row({ entityId: "leader", name: "Canva", visibility: 0.8 }),
          row({ entityId: "tracked", name: "Acme", isTrackedBrand: true, visibility: 0.5 }),
        ]),
        hero: {
          queries: 100,
          mentions: 90,
          citations: 15,
          brandMentionRate: 0.9,
          brandAbsenceRate: 0.1,
          brandFirstMentionRate: 0.3,
        },
      },
      isLoading: false,
      isError: false,
    };
    render(<InsightsScreen />);
    expect(screen.queryByText(/absent from/i)).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------
  // AI summary section
  // -------------------------------------------------------------------

  it("does not render the AI summary CTA when there's no scan data", () => {
    render(<InsightsScreen />);
    expect(screen.queryByRole("button", { name: /Generate AI summary/i })).not.toBeInTheDocument();
  });

  it("shows the Generate button once there's scan data + calls the mutation on click", async () => {
    withData();
    render(<InsightsScreen />);
    const button = screen.getByRole("button", { name: /Generate AI summary/i });
    await userEvent.click(button);
    expect(narrativeMutate).toHaveBeenCalledOnce();
    // First arg has selection + trackerIds; verify shape rather than
    // exact dates (the selection is a moving 30-day window).
    const [args] = narrativeMutate.mock.calls[0];
    expect(args).toHaveProperty("selection");
    expect(args.trackerIds).toEqual([]);
  });

  it("shows an 'Asking the model…' indicator while the mutation is pending", () => {
    withData();
    narrativeState = { isPending: true, isError: false };
    render(<InsightsScreen />);
    expect(screen.getByText(/Asking the model/i)).toBeInTheDocument();
  });

  it("renders the AI summary text + a 'via {platform}' byline on success", () => {
    withData();
    narrativeState = {
      data: { narrative: "Acme is trailing Canva by 30 points.", platformCode: "openai" },
      isPending: false,
      isError: false,
    };
    render(<InsightsScreen />);
    expect(screen.getByText(/Acme is trailing Canva by 30 points\./i)).toBeInTheDocument();
    expect(screen.getByText(/via openai/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
  });

  it("renders an error message + Regenerate button when the mutation fails", () => {
    withData();
    narrativeState = {
      isPending: false,
      isError: true,
      error: new Error("The 'openai' platform is not configured. Add an API key first."),
    };
    render(<InsightsScreen />);
    expect(screen.getByText(/openai.*not configured/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
  });
});
