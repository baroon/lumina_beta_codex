import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { ScanCompetitorDetailDto } from "@/types/api";
import { ScanCompetitorDetailScreen } from "./ScanCompetitorDetailScreen";

type HookReturn = {
  data?: ScanCompetitorDetailDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;

vi.mock("../hooks/useScanCompetitor", () => ({
  useScanCompetitor: () => hookState,
}));
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

const fixture: ScanCompetitorDetailDto = {
  scanRunId: "scan-1",
  competitorId: "c1",
  name: "Acme",
  domain: "acme.com",
  metrics: {
    mentionCount: 12,
    recommendationCount: 4,
    mentionRate: 0.4,
    recommendationRate: 0.33,
  },
  sourcesMentioningCompetitor: [
    {
      sourceId: "s1",
      sourceName: "Trustpilot",
      normalizedDomain: "trustpilot.com",
      citationCount: 5,
    },
  ],
};

describe("ScanCompetitorDetailScreen", () => {
  it("renders loading state", () => {
    hookState = { isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(
      <ScanCompetitorDetailScreen scanRunId="scan-1" competitorId="c1" />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders 404 placeholder when competitor not found", () => {
    hookState = {
      isLoading: false,
      isError: true,
      error: new ApiError(404, "not found"),
      refetch: vi.fn(),
    };
    render(<ScanCompetitorDetailScreen scanRunId="scan-1" competitorId="missing" />);
    expect(screen.getByText(/competitor data not found/i)).toBeInTheDocument();
  });

  it("renders competitor name + metrics + sources section", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<ScanCompetitorDetailScreen scanRunId="scan-1" competitorId="c1" />);

    expect(screen.getByRole("heading", { name: "Acme" })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument(); // mention count tile
    expect(screen.getByText("40.0%")).toBeInTheDocument(); // mention rate
    expect(screen.getByText("Trustpilot")).toBeInTheDocument();
    expect(screen.getByText("trustpilot.com")).toBeInTheDocument();
  });

  it("renders the sources empty-state when the competitor has no associated sources", () => {
    hookState = {
      isLoading: false,
      isError: false,
      data: { ...fixture, sourcesMentioningCompetitor: [] },
      refetch: vi.fn(),
    };
    render(<ScanCompetitorDetailScreen scanRunId="scan-1" competitorId="c1" />);
    expect(
      screen.getByText(/no sources were cited on answers that mentioned this competitor/i),
    ).toBeInTheDocument();
  });
});
