import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { deriveScanHistorySummary } from "@/features/reports/scanHistory";
import type { ScanListItemDto } from "@/types/api";
import { ScanListScreen } from "./ScanListScreen";

type HookReturn = {
  data?: ScanListItemDto[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;

vi.mock("../hooks/useAllScans", () => ({
  useAllScans: () => hookState,
}));

// TanStack <Link> blows up without a router context. Mirror the pattern from
// BrandList.test.tsx: stub it as a plain <a> so the rendered href is the
// thing we can actually assert on.
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
      for (const [k, v] of Object.entries(params)) {
        href = href.replace(`$${k}`, v);
      }
    }
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

function row(overrides: Partial<ScanListItemDto> = {}): ScanListItemDto {
  return {
    scanRunId: "s1",
    trackerId: "t1",
    trackerName: "Tracker A",
    brandId: "b1",
    brandName: "Brand A",
    startedAt: "2026-05-27T10:00:00Z",
    completedAt: "2026-05-27T10:05:00Z",
    scanStatus: "Completed",
    analysisStatus: "Completed",
    scanCheckCount: 5,
    completedCount: 5,
    failedCount: 0,
    ...overrides,
  };
}

describe("ScanListScreen", () => {
  it("renders the loading skeleton while fetching", () => {
    hookState = { isLoading: true, isError: false, error: null, refetch: vi.fn() };
    const { container } = render(<ScanListScreen />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders an empty state when there are no scans", () => {
    hookState = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
    render(<ScanListScreen />);
    expect(screen.getByText(/no scans have run yet/i)).toBeInTheDocument();
  });

  it("renders one row per scan with a link to the results page", () => {
    hookState = {
      data: [
        row({ scanRunId: "s1" }),
        row({
          scanRunId: "s2",
          brandName: "Brand B",
          scanCheckCount: 5,
          completedCount: 3,
          failedCount: 2,
        }),
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanListScreen />);

    expect(screen.getByText("Checks completed")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("Scan runs")).toBeInTheDocument();
    expect(screen.getByText("Brand A")).toBeInTheDocument();
    expect(screen.getByText("Brand B")).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.some((l) => l.getAttribute("href") === "/scans/s1/results")).toBe(true);
    expect(links.some((l) => l.getAttribute("href") === "/scans/s2/results")).toBe(true);
  });

  it("shows an em-dash placeholder when analysisStatus is null", () => {
    hookState = {
      data: [row({ analysisStatus: null })],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanListScreen />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
  it("derives scan history summary metrics from scan rows", () => {
    const summary = deriveScanHistorySummary([
      row({
        completedAt: "2026-05-27T10:05:00Z",
        scanCheckCount: 10,
        completedCount: 10,
      }),
      row({
        completedAt: "2026-05-28T12:00:00Z",
        scanCheckCount: 10,
        completedCount: 7,
        failedCount: 3,
      }),
    ]);

    expect(summary.lastCompletedScan).toContain("May 28");
    expect(summary.checksCompleted).toBe("17");
    expect(summary.successRate).toBe("85%");
    expect(summary.failedRuns).toBe("1");
  });
});
