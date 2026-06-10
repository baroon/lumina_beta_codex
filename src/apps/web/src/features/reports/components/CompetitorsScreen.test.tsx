import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EntityMentionDto, EntityRateDto, WorkspaceCompetitiveDto } from "@/types/api";

let scopeState: { scope: "all" | string[] };
let competitiveState: {
  data?: WorkspaceCompetitiveDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => scopeState,
}));
vi.mock("@/features/reports/hooks/useWorkspaceCompetitive", () => ({
  useWorkspaceCompetitive: () => ({ ...competitiveState, refetch: vi.fn() }),
}));

import { CompetitorsScreen, mergeEntityRows } from "./CompetitorsScreen";

function mention(overrides: Partial<EntityMentionDto>): EntityMentionDto {
  return {
    entityType: "Brand",
    entityId: "x",
    name: "X",
    isTrackedBrand: false,
    mentionCount: 0,
    share: 0,
    ...overrides,
  };
}

function rate(overrides: Partial<EntityRateDto>): EntityRateDto {
  return {
    entityType: "Brand",
    entityId: "x",
    name: "X",
    isTrackedBrand: false,
    mentionCount: 0,
    recommendationRate: null,
    ...overrides,
  };
}

function competitive(
  mentions: EntityMentionDto[],
  rates: EntityRateDto[],
): WorkspaceCompetitiveDto {
  return {
    workspaceId: "w1",
    from: "2026-05-09T00:00:00Z",
    to: "2026-06-09T00:00:00Z",
    topDomains: [],
    domainTypes: [],
    mentionDistribution: mentions,
    competitiveGaps: [],
    recommendationRates: rates,
  };
}

beforeEach(() => {
  scopeState = { scope: "all" };
  competitiveState = { data: competitive([], []), isLoading: false, isError: false };
});

describe("mergeEntityRows (pure)", () => {
  it("returns an empty list when both inputs are empty", () => {
    expect(mergeEntityRows([], [])).toEqual([]);
  });

  it("merges mention + recommendation rate for the same entity", () => {
    const rows = mergeEntityRows(
      [mention({ entityId: "a", name: "Acme", mentionCount: 8, share: 0.5 })],
      [rate({ entityId: "a", name: "Acme", mentionCount: 8, recommendationRate: 0.25 })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      entityId: "a",
      mentionCount: 8,
      shareOfVoice: 0.5,
      recommendationRate: 0.25,
    });
  });

  it("includes entities present only in the rates list", () => {
    const rows = mergeEntityRows(
      [],
      [rate({ entityId: "a", name: "Acme", mentionCount: 4, recommendationRate: 0.5 })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].shareOfVoice).toBe(0);
    expect(rows[0].recommendationRate).toBe(0.5);
  });

  it("sorts results by mention count descending", () => {
    const rows = mergeEntityRows(
      [
        mention({ entityId: "low", name: "Low", mentionCount: 2 }),
        mention({ entityId: "high", name: "High", mentionCount: 9 }),
        mention({ entityId: "mid", name: "Mid", mentionCount: 5 }),
      ],
      [],
    );
    expect(rows.map((r) => r.name)).toEqual(["High", "Mid", "Low"]);
  });
});

describe("CompetitorsScreen", () => {
  it("renders the page header", () => {
    render(<CompetitorsScreen />);
    expect(screen.getByRole("heading", { name: /Competitors/i })).toBeInTheDocument();
  });

  it("shows the empty hint when there's no competitor data", () => {
    render(<CompetitorsScreen />);
    expect(screen.getByText(/no competitor data in scope yet/i)).toBeInTheDocument();
  });

  it("renders one ranking row per merged entity, sorted by mention count", () => {
    competitiveState = {
      data: competitive(
        [
          mention({ entityId: "leader", name: "Canva", mentionCount: 12, share: 0.4 }),
          mention({
            entityId: "you",
            name: "Acme",
            isTrackedBrand: true,
            mentionCount: 8,
            share: 0.3,
          }),
        ],
        [
          rate({ entityId: "leader", name: "Canva", mentionCount: 12, recommendationRate: 0.3 }),
          rate({
            entityId: "you",
            name: "Acme",
            isTrackedBrand: true,
            mentionCount: 8,
            recommendationRate: 0.5,
          }),
        ],
      ),
      isLoading: false,
      isError: false,
    };
    render(<CompetitorsScreen />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Canva")).toBeInTheDocument();
    expect(within(table).getByText("Acme")).toBeInTheDocument();
    expect(within(table).getByText("You")).toBeInTheDocument();
    // Canva's recommendation rate is 30%; Acme's SoV is also 30% so "30%"
    // appears in two cells. Assert count to avoid a brittle single-match.
    expect(within(table).getAllByText("30%").length).toBeGreaterThanOrEqual(1);
    expect(within(table).getByText("50%")).toBeInTheDocument();
    // Leader badge on the rank-1 non-tracked-brand row.
    expect(within(table).getByText("Leader")).toBeInTheDocument();
  });

  it("renders '—' for entities with no recommendation rate", () => {
    competitiveState = {
      data: competitive(
        [mention({ entityId: "a", name: "Acme", mentionCount: 4, share: 0.5 })],
        [],
      ),
      isLoading: false,
      isError: false,
    };
    render(<CompetitorsScreen />);
    const table = screen.getByRole("table");
    // The em-dash placeholder appears in the recommendation cell.
    expect(within(table).getByText("—")).toBeInTheDocument();
  });
});
