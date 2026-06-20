import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LensCountDto, WorkspaceOverviewDto } from "@/types/api";
import {
  buildLensRows,
  countLensRowsByStatus,
  deriveLensAttentionItems,
  filterLensRows,
} from "@/features/reports/lenses";

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
let objectUrlSpy: ReturnType<typeof vi.fn>;
let revokeUrlSpy: ReturnType<typeof vi.fn>;

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
  objectUrlSpy = vi.fn(() => "blob:lens-brief");
  revokeUrlSpy = vi.fn();
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: objectUrlSpy,
    revokeObjectURL: revokeUrlSpy,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("LensesScreen", () => {
  it("builds, counts, and filters lens rows by status", () => {
    const rows = buildLensRows(lensCountsState.data ?? []);

    expect(countLensRowsByStatus(rows)).toEqual({
      Healthy: 3,
      Sparse: 2,
      "No evidence": 1,
    });
    expect(filterLensRows(rows, "No evidence").map((row) => row.name)).toEqual([
      "Sentiment & Trust",
    ]);
    expect(filterLensRows(rows, "Sparse").map((row) => row.name)).toEqual([
      "Competitor Comparison",
      "Content Gaps",
    ]);
    expect(rows.find((row) => row.name === "Discovery")?.primaryMetric).toBe("Mention rate");
    expect(rows.find((row) => row.name === "Buying Intent")?.primaryMetric).toBe(
      "Recommendation rate",
    );
  });

  it("derives attention items for sparse and no-evidence lenses", () => {
    const rows = buildLensRows(lensCountsState.data ?? []);
    const items = deriveLensAttentionItems(rows);

    expect(items.map((item) => item.name)).toEqual([
      "Sentiment & Trust",
      "Competitor Comparison",
      "Content Gaps",
    ]);
    expect(items[0]).toMatchObject({
      action: "Add evidence",
      priority: "High",
      status: "No evidence",
    });
    expect(items[1]).toMatchObject({
      action: "Strengthen coverage",
      priority: "Medium",
      status: "Sparse",
    });
  });

  it("renders summary tiles and one row for each visibility lens", () => {
    render(<LensesScreen />);

    expect(screen.getByRole("heading", { name: "Lenses" })).toBeInTheDocument();
    expect(screen.getByText("Visibility lenses")).toBeInTheDocument();
    expect(screen.getByText("AI questions")).toBeInTheDocument();
    expect(screen.getByText("Brand mentions")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Primary metric")).toBeInTheDocument();
    expect(screen.getByText("Recommendation rate")).toBeInTheDocument();
    expect(screen.getByText("Owned citation share")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lens attention" })).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Discovery")).toBeInTheDocument();
    expect(within(table).getByText("Buying Intent")).toBeInTheDocument();
    expect(within(table).getByText("Content Gaps")).toBeInTheDocument();
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

  it("renders lens attention cards with priority and action links", () => {
    render(<LensesScreen />);

    const attention = screen.getByRole("region", { name: "Lens attention" });
    expect(within(attention).getByText("Sentiment & Trust")).toBeInTheDocument();
    expect(within(attention).getByText("Priority: High")).toBeInTheDocument();
    expect(within(attention).getByText("Add evidence")).toBeInTheDocument();
    expect(within(attention).getAllByRole("link", { name: /Open lens/i })[0]).toHaveAttribute(
      "href",
      "/lenses/sentiment",
    );
  });

  it("shows an all-clear lens attention state when every lens is healthy", () => {
    lensCountsState = {
      ...lensCountsState,
      data: [
        { lensCode: "Discovery", mentionCount: 10 },
        { lensCode: "BuyingIntent", mentionCount: 10 },
        { lensCode: "CompetitorComparison", mentionCount: 10 },
        { lensCode: "SentimentAndTrust", mentionCount: 10 },
        { lensCode: "CitationVisibility", mentionCount: 10 },
        { lensCode: "ContentGaps", mentionCount: 10 },
      ],
    };
    render(<LensesScreen />);

    const attention = screen.getByRole("region", { name: "Lens attention" });
    expect(
      within(attention).getByText("All visibility lenses have enough current evidence."),
    ).toBeInTheDocument();
  });

  it("filters the lens table by status", async () => {
    render(<LensesScreen />);

    await userEvent.click(screen.getByRole("button", { name: /no evidence\s+1/i }));

    const table = screen.getByRole("table");
    expect(within(table).getByText("Sentiment & Trust")).toBeInTheDocument();
    expect(within(table).queryByText("Discovery")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(within(table).getByText("Discovery")).toBeInTheDocument();
  });

  it("queues and exports the filtered lens brief package", async () => {
    render(<LensesScreen />);

    await userEvent.click(screen.getByRole("button", { name: /sparse\s+2/i }));
    await userEvent.click(screen.getByRole("button", { name: "Add to report" }));

    expect(screen.getByRole("button", { name: "Added to report" })).toBeDisabled();
    expect(screen.getByText("2 lenses were added to the lens report.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Export lens brief" }));

    expect(objectUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith("blob:lens-brief");
    expect(screen.getByText("Lens brief exported with 2 lenses.")).toBeInTheDocument();
  });

  it("keeps the page visible when lens counts fail", () => {
    lensCountsState = { data: undefined, isLoading: false, isError: true };

    render(<LensesScreen />);

    expect(screen.getByText("Lens counts are unavailable for this range.")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Discovery")).toBeInTheDocument();
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
