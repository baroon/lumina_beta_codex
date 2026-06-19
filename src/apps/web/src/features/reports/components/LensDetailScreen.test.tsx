import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceOverviewDto } from "@/types/api";
import {
  countLensEntitiesBySentiment,
  countLensEntitiesByType,
  deriveLensDiagnosis,
  filterLensEntities,
} from "@/features/reports/lenses";

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
let objectUrlSpy: ReturnType<typeof vi.fn>;
let revokeUrlSpy: ReturnType<typeof vi.fn>;

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
  objectUrlSpy = vi.fn(() => "blob:lens-detail");
  revokeUrlSpy = vi.fn();
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: objectUrlSpy,
    revokeObjectURL: revokeUrlSpy,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("LensDetailScreen", () => {
  it("filters and counts lens entities by type and sentiment", () => {
    const entities = overview().topEntities;

    expect(countLensEntitiesByType(entities)).toEqual({ Brand: 1, Competitor: 1 });
    expect(countLensEntitiesBySentiment(entities)).toEqual({
      Positive: 1,
      Neutral: 1,
      Negative: 0,
      Unknown: 0,
    });
    expect(filterLensEntities(entities, "Competitor", null).map((entity) => entity.name)).toEqual([
      "Canva",
    ]);
    expect(filterLensEntities(entities, null, "Positive").map((entity) => entity.name)).toEqual([
      "Acme",
    ]);
  });

  it("derives a lens diagnosis from lens-scoped overview metrics", () => {
    expect(deriveLensDiagnosis(overview({ hero: { ...overview().hero, queries: 0 } }))).toEqual({
      code: "NeedsData",
      priority: "High",
      signal: "0 AI questions",
    });
    expect(
      deriveLensDiagnosis(
        overview({ hero: { ...overview().hero, brandAbsenceRate: 0.62, brandMentionRate: 0.25 } }),
      ),
    ).toMatchObject({ code: "HighAbsence", priority: "High", signal: "62% absence" });
    expect(
      deriveLensDiagnosis(
        overview({ hero: { ...overview().hero, brandAbsenceRate: 0.2, brandMentionRate: 0.25 } }),
      ),
    ).toMatchObject({ code: "LowMention", priority: "Medium", signal: "25% mention rate" });
    expect(deriveLensDiagnosis(overview())).toMatchObject({
      code: "Healthy",
      priority: "Low",
      signal: "40% mention rate",
    });
  });

  it("renders the selected lens summary and entity table", () => {
    render(<LensDetailScreen lensId="discovery" />);

    expect(screen.getByRole("heading", { name: "Discovery" })).toBeInTheDocument();
    expect(screen.getByText("AI questions")).toBeInTheDocument();
    expect(screen.getByText("Mention rate")).toBeInTheDocument();
    expect(screen.getByText("Lens signals")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lens diagnosis" })).toBeInTheDocument();
    expect(screen.getByText("Maintain current coverage")).toBeInTheDocument();
    expect(screen.getByText("Priority: Low")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View recommendations" })).toBeEnabled();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Canva")).toBeInTheDocument();
  });

  it("prepares lens recommendations from the current diagnosis", async () => {
    render(<LensDetailScreen lensId="discovery" />);

    await userEvent.click(screen.getByRole("button", { name: "View recommendations" }));

    expect(screen.getByRole("button", { name: "Recommendations ready" })).toBeDisabled();
    expect(screen.getByText("Recommendations prepared for Discovery.")).toBeInTheDocument();
  });

  it("exports the lens detail brief package", async () => {
    render(<LensDetailScreen lensId="discovery" />);

    await userEvent.click(screen.getByRole("button", { name: "Export lens brief" }));

    expect(objectUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith("blob:lens-detail");
    expect(screen.getByText("Discovery lens brief exported.")).toBeInTheDocument();
  });

  it("renders a high-priority diagnosis when absence is high", () => {
    overviewState = {
      ...overviewState,
      data: overview({ hero: { ...overview().hero, brandAbsenceRate: 0.65 } }),
    };

    render(<LensDetailScreen lensId="discovery" />);

    const diagnosis = screen.getByRole("region", { name: "Lens diagnosis" });
    expect(within(diagnosis).getByText("Reduce brand absence")).toBeInTheDocument();
    expect(within(diagnosis).getByText("Priority: High")).toBeInTheDocument();
    expect(within(diagnosis).getByText("Signal: 65% absence")).toBeInTheDocument();
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

  it("filters the entity table by type and sentiment", async () => {
    render(<LensDetailScreen lensId="discovery" />);

    await userEvent.click(screen.getByRole("button", { name: /competitor\s+1/i }));

    const table = screen.getByRole("table");
    expect(within(table).getByText("Canva")).toBeInTheDocument();
    expect(within(table).queryByText("Acme")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    await userEvent.click(screen.getByRole("button", { name: /positive\s+1/i }));

    expect(within(table).getByText("Acme")).toBeInTheDocument();
    expect(within(table).queryByText("Canva")).not.toBeInTheDocument();
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
