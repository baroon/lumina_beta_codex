import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceOverviewDto } from "@/types/api";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

let overviewState: {
  data?: WorkspaceOverviewDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: ReturnType<typeof vi.fn>;
};
const useWorkspaceOverviewMock = vi.fn();

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => ({ scope: "all" }),
}));

vi.mock("@/features/reports/hooks/useWorkspaceOverview", () => ({
  useWorkspaceOverview: (...args: unknown[]) => useWorkspaceOverviewMock(...args),
}));

import { LensDetailScreen } from "./LensDetailScreen";

beforeEach(() => {
  overviewState = {
    data: overview(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
  useWorkspaceOverviewMock.mockReset();
  useWorkspaceOverviewMock.mockImplementation(() => overviewState);
});

describe("LensDetailScreen", () => {
  it("renders the selected lens summary and entity table", () => {
    render(<LensDetailScreen lensId="discovery" />);

    expect(screen.getByRole("heading", { name: "Discovery" })).toBeInTheDocument();
    expect(screen.getByText("AI questions")).toBeInTheDocument();
    expect(screen.getByText("Mention rate")).toBeInTheDocument();
    expect(screen.getByText("Lens signals")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Canva")).toBeInTheDocument();
  });

  it("filters overview data by the selected lens code", () => {
    render(<LensDetailScreen lensId="buying-intent" />);

    expect(useWorkspaceOverviewMock).toHaveBeenCalled();
    const [, lensCodes] = useWorkspaceOverviewMock.mock.calls[0];
    expect(lensCodes).toEqual(["BuyingIntent"]);
  });

  it("renders tracked brands with the You chip", () => {
    render(<LensDetailScreen lensId="competitive" />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("You")).toBeInTheDocument();
  });

  it("renders the empty entity state when the lens has no entities", () => {
    overviewState = {
      ...overviewState,
      data: overview({ topEntities: [] }),
    };

    render(<LensDetailScreen lensId="citations" />);

    expect(screen.getByText(/No entity evidence yet/i)).toBeInTheDocument();
  });

  it("renders an error for an unknown lens slug", () => {
    render(<LensDetailScreen lensId="unknown-lens" />);

    expect(screen.getByText("Lens not found")).toBeInTheDocument();
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
      brandAbsenceRate: 0.25,
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
      {
        entityType: "Competitor",
        entityId: "c1",
        name: "Canva",
        isTrackedBrand: false,
        visibility: 0.7,
        visibilityDelta: 0,
        shareOfVoice: 0.55,
        shareOfVoiceDelta: 0,
        sentiment: "Neutral",
        sentimentDelta: 0,
      },
    ],
    topBrandAttributes: [],
    coMentions: [],
    topBrandRiskFlags: [],
    topBrandComparisons: [],
    topicOwnership: [],
    recentFactualClaims: [],
    ...overrides,
  };
}
