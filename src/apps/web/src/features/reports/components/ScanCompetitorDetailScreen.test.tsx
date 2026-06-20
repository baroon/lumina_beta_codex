import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { ScanCompetitorDetailDto } from "@/types/api";

vi.mock("./ScanBreadcrumb", () => ({ ScanBreadcrumb: () => null }));

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

  it("queues the competitor detail for reporting and exports an evidence package", async () => {
    const objectUrlSpy = vi.fn(() => "blob:scan-competitor-detail");
    const revokeUrlSpy = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: objectUrlSpy,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeUrlSpy,
    });
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };

    try {
      render(<ScanCompetitorDetailScreen scanRunId="scan-1" competitorId="c1" />);

      await userEvent.click(screen.getByRole("button", { name: "Add to report" }));
      expect(screen.getByRole("button", { name: "Added to report" })).toBeDisabled();
      expect(screen.getByText("Acme was added to the scan competitor report.")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Export package" }));
      expect(objectUrlSpy).toHaveBeenCalledOnce();
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(revokeUrlSpy).toHaveBeenCalledWith("blob:scan-competitor-detail");
      expect(screen.getByText("Acme competitor detail package exported.")).toBeInTheDocument();
    } finally {
      clickSpy.mockRestore();
    }
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
