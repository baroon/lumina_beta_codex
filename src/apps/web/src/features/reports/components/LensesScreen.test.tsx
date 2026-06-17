import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LensCountDto, WorkspaceOverviewDto } from "@/types/api";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    className?: string;
  }) => {
    let href = to;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, value);
      }
    }
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

let overviewState: {
  data?: WorkspaceOverviewDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: ReturnType<typeof vi.fn>;
};

let lensCountsState: {
  data?: LensCountDto[];
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

vi.mock("@/features/reports/hooks/useLensCounts", () => ({
  useLensCounts: () => lensCountsState,
}));

import { LensesScreen } from "./LensesScreen";

beforeEach(() => {
  overviewState = {
    data: overview(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
  lensCountsState = {
    data: [
      { lensCode: "Discovery", mentionCount: 12 },
      { lensCode: "BuyingIntent", mentionCount: 6 },
      { lensCode: "CompetitorComparison", mentionCount: 2 },
      { lensCode: "SentimentAndTrust", mentionCount: 0 },
      { lensCode: "CitationVisibility", mentionCount: 4 },
      { lensCode: "ContentGaps", mentionCount: 1 },
    ],
    isLoading: false,
    isError: false,
  };
});

describe("LensesScreen", () => {
  it("renders summary tiles and one row for each visibility lens", () => {
    render(<LensesScreen />);

    expect(screen.getByRole("heading", { name: "Lenses" })).toBeInTheDocument();
    expect(screen.getByText("Visibility lenses")).toBeInTheDocument();
    expect(screen.getByText("AI questions")).toBeInTheDocument();
    expect(screen.getByText("Brand mentions")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("Buying Intent")).toBeInTheDocument();
    expect(screen.getByText("Content Gaps")).toBeInTheDocument();
  });

  it("links lens rows to their detail route", () => {
    render(<LensesScreen />);

    expect(screen.getByRole("link", { name: /Discovery/i })).toHaveAttribute(
      "href",
      "/lenses/discovery",
    );
    expect(screen.getByRole("link", { name: /Buying Intent/i })).toHaveAttribute(
      "href",
      "/lenses/buying-intent",
    );
  });

  it("renders health statuses from lens mention distribution", () => {
    render(<LensesScreen />);

    const table = screen.getByRole("table");
    expect(within(table).getAllByText("Healthy").length).toBeGreaterThanOrEqual(1);
    expect(within(table).getAllByText("Sparse").length).toBeGreaterThanOrEqual(1);
    expect(within(table).getByText("No evidence")).toBeInTheDocument();
  });

  it("keeps the page visible when lens counts fail", () => {
    lensCountsState = { data: undefined, isLoading: false, isError: true };

    render(<LensesScreen />);

    expect(screen.getByText("Lens counts are unavailable for this range.")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
  });

  it("renders the shared error state when overview fails", () => {
    overviewState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Overview failed"),
      refetch: vi.fn(),
    };

    render(<LensesScreen />);

    expect(screen.getByText("Overview failed")).toBeInTheDocument();
  });
});

function overview(overrides: Partial<WorkspaceOverviewDto> = {}): WorkspaceOverviewDto {
  return {
    workspaceId: "w1",
    from: null,
    to: "2026-06-16T00:00:00.000Z",
    trackedBrands: [{ brandId: "b1", name: "Acme" }],
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
    topicOwnership: [],
    recentFactualClaims: [],
    ...overrides,
  };
}
