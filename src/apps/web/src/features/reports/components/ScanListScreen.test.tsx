import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  countScansByStatus,
  deriveScanAttentionItems,
  deriveScanHistorySummary,
  filterScansByStatus,
  formatScanDuration,
} from "@/features/reports/scanHistory";
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
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Brand A")).toBeInTheDocument();
    expect(screen.getByText("Brand B")).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.some((l) => l.getAttribute("href") === "/scans/s1/results")).toBe(true);
    expect(links.some((l) => l.getAttribute("href") === "/scans/s2/results")).toBe(true);
  });

  it("renders row actions and keeps rerun disabled for healthy completed scans", async () => {
    hookState = {
      data: [row({ scanRunId: "s1" })],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanListScreen />);

    expect(screen.getByRole("button", { name: "View details" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Rerun" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Add to report" }));
    expect(screen.getByRole("button", { name: "Added to report" })).toBeDisabled();
    expect(
      screen.getByText("Brand A / Tracker A was added to the scan report."),
    ).toBeInTheDocument();
  });

  it("queues a failed scan rerun from the row action", async () => {
    hookState = {
      data: [row({ scanRunId: "s1", scanStatus: "Failed", failedCount: 2, completedCount: 3 })],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanListScreen />);

    await userEvent.click(screen.getByRole("button", { name: "Rerun" }));

    expect(screen.getByRole("button", { name: "Rerun queued" })).toBeDisabled();
    expect(screen.getByText("Brand A / Tracker A was queued for rerun.")).toBeInTheDocument();
  });

  it("opens a scan summary drawer with evidence and workflow actions", async () => {
    hookState = {
      data: [row({ scanRunId: "s1" })],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanListScreen />);

    await userEvent.click(screen.getByRole("button", { name: "View details" }));

    const drawer = screen.getByRole("dialog", { name: /scan:/i });
    expect(within(drawer).getByText("Summary")).toBeInTheDocument();
    expect(within(drawer).getByText("Platforms")).toBeInTheDocument();
    expect(within(drawer).getByText("AI Questions")).toBeInTheDocument();
    expect(within(drawer).getByText("5/5")).toBeInTheDocument();
    expect(within(drawer).getByText("5 mins")).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "Open evidence" })).toHaveAttribute(
      "href",
      "/scans/s1/results",
    );
    expect(within(drawer).getByRole("button", { name: "Rerun" })).toBeDisabled();
    await userEvent.click(within(drawer).getByRole("button", { name: "Add to report" }));
    expect(within(drawer).getByRole("button", { name: "Added to report" })).toBeDisabled();
    expect(
      screen.getByText("Brand A / Tracker A was added to the scan report."),
    ).toBeInTheDocument();
  });

  it("shares failed scan action state between the row and summary drawer", async () => {
    hookState = {
      data: [row({ scanRunId: "s1", scanStatus: "Failed", failedCount: 2, completedCount: 3 })],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanListScreen />);

    await userEvent.click(screen.getByRole("button", { name: "View details" }));
    const drawer = screen.getByRole("dialog", { name: /scan:/i });
    await userEvent.click(within(drawer).getByRole("button", { name: "Rerun" }));

    expect(within(drawer).getByRole("button", { name: "Rerun queued" })).toBeDisabled();
    expect(screen.getByText("Brand A / Tracker A was queued for rerun.")).toBeInTheDocument();
  });

  it("renders scan attention cards and opens the summary drawer", async () => {
    hookState = {
      data: [
        row({
          scanRunId: "s1",
          brandName: "Failed Brand",
          scanStatus: "Failed",
          failedCount: 2,
          completedCount: 3,
        }),
        row({ scanRunId: "s2", brandName: "Healthy Brand" }),
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanListScreen />);

    const attention = screen.getByRole("region", { name: "Scan attention" });
    expect(within(attention).getByText("Failed Brand / Tracker A")).toBeInTheDocument();
    expect(within(attention).getByText("Review failures")).toBeInTheDocument();
    expect(within(attention).queryByText("Healthy Brand / Tracker A")).not.toBeInTheDocument();

    await userEvent.click(within(attention).getByRole("button", { name: "Open summary" }));

    const drawer = screen.getByRole("dialog", { name: /scan:/i });
    expect(within(drawer).getByText("Failed Brand")).toBeInTheDocument();
  });

  it("filters scan runs by status and clears the filter", async () => {
    hookState = {
      data: [
        row({ scanRunId: "s1", brandName: "Completed Brand", scanStatus: "Completed" }),
        row({
          scanRunId: "s2",
          brandName: "Failed Brand",
          scanStatus: "Failed",
          failedCount: 2,
          completedCount: 3,
        }),
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanListScreen />);

    await userEvent.click(screen.getByRole("button", { name: /^Failed\s+1$/i }));

    expect(screen.queryByText("Completed Brand")).not.toBeInTheDocument();
    expect(screen.getByText("Failed Brand")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(screen.getByText("Completed Brand")).toBeInTheDocument();
    expect(screen.getByText("Failed Brand")).toBeInTheDocument();
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
    expect(screen.getAllByText("Completed").length).toBeGreaterThanOrEqual(1);
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

  it("filters and counts scan rows by status", () => {
    const rows = [
      row({ scanStatus: "Completed" }),
      row({ scanRunId: "s2", scanStatus: "Failed" }),
      row({ scanRunId: "s3", scanStatus: "Running" }),
    ];

    expect(filterScansByStatus(rows, "Failed").map((scan) => scan.scanRunId)).toEqual(["s2"]);
    expect(countScansByStatus(rows)).toEqual({
      Completed: 1,
      Running: 1,
      Failed: 1,
      Pending: 0,
    });
  });

  it("derives prioritized scan attention items", () => {
    const items = deriveScanAttentionItems([
      row({ scanRunId: "healthy" }),
      row({
        scanRunId: "analysis",
        analysisStatus: null,
        startedAt: "2026-05-29T10:00:00Z",
      }),
      row({
        scanRunId: "failed",
        scanStatus: "Failed",
        failedCount: 2,
        startedAt: "2026-05-28T10:00:00Z",
      }),
      row({
        scanRunId: "running",
        scanStatus: "Running",
        startedAt: "2026-05-30T10:00:00Z",
      }),
    ]);

    expect(items.map((item) => item.scanRunId)).toEqual(["failed", "running", "analysis"]);
    expect(items[0]).toMatchObject({
      priority: "High",
      action: "Review failures",
    });
    expect(items[1]).toMatchObject({
      priority: "Medium",
      action: "Monitor progress",
    });
    expect(items[2]).toMatchObject({
      priority: "Medium",
      action: "Wait for analysis",
    });
  });

  it("formats completed scan duration", () => {
    expect(formatScanDuration(row())).toBe("5 mins");
    expect(formatScanDuration(row({ completedAt: null }))).toBe("—");
  });
});
