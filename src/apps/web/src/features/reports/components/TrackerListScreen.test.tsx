import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
const navigateMock = vi.fn();

vi.mock("../hooks/useAllTrackers", () => ({
  useAllTrackers: () => hookState,
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

  it("renders the tracker-name link pointing at the dashboard", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerListScreen />);
    // The Link stub keeps `to` as the href, with template params unresolved.
    const link = screen.getByRole("link", { name: "Nostri Tracker" });
    expect(link).toHaveAttribute("href", "/trackers/$trackerId/dashboard");
  });
});
