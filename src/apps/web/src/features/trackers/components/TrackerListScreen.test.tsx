import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { TrackerListItemDto } from "@/types/api";
import { TrackerListScreen } from "./TrackerListScreen";

type HookReturn = {
  data?: TrackerListItemDto[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;

vi.mock("../hooks/useAllTrackers", () => ({
  useAllTrackers: () => hookState,
}));

// Per-row Run-now mutation: capture mutate calls + drive success/error
// from the test. Each test resets these.
const runScanMutate = vi.fn();
let runScanIsPending = false;
vi.mock("../hooks/useScans", () => ({
  useRunScan: () => ({ mutate: runScanMutate, isPending: runScanIsPending }),
}));

beforeEach(() => {
  runScanMutate.mockReset();
  runScanIsPending = false;
});

const fixture: TrackerListItemDto[] = [
  {
    trackerId: "t1",
    name: "Nostri Tracker",
    brandId: "b1",
    brandName: "Nostri",
    status: "Active",
    createdAt: "2026-04-15T12:00:00Z",
    scanCount: 8,
    latestScanCompletedAt: "2026-05-27T17:01:29Z",
  },
  {
    trackerId: "t2",
    name: "Acme Tracker",
    brandId: "b2",
    brandName: "Acme",
    status: "Draft",
    createdAt: "2026-05-10T09:30:00Z",
    scanCount: 0,
    latestScanCompletedAt: null,
  },
];

describe("TrackerListScreen", () => {
  it("renders loading state", () => {
    hookState = { isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(<TrackerListScreen />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders empty state when no trackers", () => {
    hookState = { isLoading: false, isError: false, data: [], refetch: vi.fn() };
    render(<TrackerListScreen />);
    expect(screen.getByText(/no trackers configured yet/i)).toBeInTheDocument();
  });

  it("renders one row per tracker with brand + status + scan stats", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerListScreen />);

    expect(screen.getByText("Nostri Tracker")).toBeInTheDocument();
    expect(screen.getByText("Acme Tracker")).toBeInTheDocument();
    expect(screen.getByText("Nostri")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders em-dash when tracker has no completed scans", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerListScreen />);
    // The Acme tracker has latestScanCompletedAt=null → "—" rendered.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("does not link rows anywhere — analytics live on /overview now", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerListScreen />);
    expect(screen.queryByRole("link", { name: "Nostri Tracker" })).not.toBeInTheDocument();
  });

  it("renders a Run now button on Active rows and triggers the mutation on click", async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    hookState = { isLoading: false, isError: false, data: fixture, refetch };
    render(<TrackerListScreen />);

    // Two Run-now buttons would exist only if both rows were runnable; the
    // Draft tracker shows a placeholder dash instead.
    const buttons = screen.getAllByRole("button", { name: /run now/i });
    expect(buttons).toHaveLength(1);

    runScanMutate.mockImplementation((_v, opts) =>
      opts.onSuccess({ scanRunId: "s1", scanCheckCount: 4 }),
    );

    await userEvent.click(buttons[0]);
    expect(runScanMutate).toHaveBeenCalledOnce();
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.getByText("Scan started.")).toBeInTheDocument();
  });

  it("surfaces the cooldown message when the API rejects with 409", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerListScreen />);

    const body = JSON.stringify({
      status: 409,
      title: "Business rule violation",
      detail: "On-demand trackers can only be run once every 24 hours.",
    });
    runScanMutate.mockImplementation((_v, opts) => opts.onError(new ApiError(409, body)));

    await userEvent.click(screen.getByRole("button", { name: /run now/i }));
    expect(screen.getByText(/once every 24 hours/i)).toBeInTheDocument();
  });
});
