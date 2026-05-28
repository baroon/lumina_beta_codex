import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { ScanCompetitorsDto } from "@/types/api";
import { ScanCompetitorsScreen } from "./ScanCompetitorsScreen";

type HookReturn = {
  data?: ScanCompetitorsDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;
const navigateMock = vi.fn();

vi.mock("../hooks/useScanCompetitors", () => ({
  useScanCompetitors: () => hookState,
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
    useNavigate: () => navigateMock,
  };
});

const fixture: ScanCompetitorsDto = {
  scanRunId: "scan-1",
  competitors: [
    {
      competitorId: "c1",
      name: "Acme",
      domain: "acme.com",
      mentionCount: 12,
      recommendationCount: 4,
      mentionRate: 0.4,
      recommendationRate: 0.33,
    },
  ],
};

describe("ScanCompetitorsScreen", () => {
  it("renders loading state", () => {
    hookState = { isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(<ScanCompetitorsScreen scanRunId="scan-1" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders 404 placeholder when scan does not exist", () => {
    hookState = {
      isLoading: false,
      isError: true,
      error: new ApiError(404, "not found"),
      refetch: vi.fn(),
    };
    render(<ScanCompetitorsScreen scanRunId="scan-1" />);
    expect(screen.getByText(/competitor data not found/i)).toBeInTheDocument();
  });

  it("renders competitors + back link on success", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<ScanCompetitorsScreen scanRunId="scan-1" />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to scan results/i })).toBeInTheDocument();
  });
});
