import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkspaceOverviewDto, WorkspaceTopEntityRowDto } from "@/types/api";

let scopeState: { scope: "all" | string[] };
let overviewState: {
  data?: WorkspaceOverviewDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => scopeState,
}));
vi.mock("@/features/reports/hooks/useWorkspaceOverview", () => ({
  useWorkspaceOverview: () => ({ ...overviewState, refetch: vi.fn() }),
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
    hero: { queries: 0, mentions: 0, citations: 0, brandMentionRate: null },
    previousHero: null,
    series: [],
    topEntities,
  };
}

beforeEach(() => {
  scopeState = { scope: "all" };
  overviewState = { data: overview([]), isLoading: false, isError: false };
});

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
});
