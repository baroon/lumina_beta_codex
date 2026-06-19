import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deriveBrandTrackerInventory } from "@/features/brands/brands";
import { BrandList } from "./BrandList";
import type { BrandDto, TrackerListItemDto } from "@/types/api";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a href="#" className={className}>
      {children}
    </a>
  ),
}));

let listState: { data?: BrandDto[]; isLoading: boolean };
let trackersState: { data?: TrackerListItemDto[]; isLoading: boolean };

vi.mock("../hooks/useBrands", () => ({
  useBrandsList: () => listState,
}));

vi.mock("@/features/brands/hooks/useBrandTrackersList", () => ({
  useBrandTrackersList: () => trackersState,
}));

describe("BrandList", () => {
  beforeEach(() => {
    navigate.mockReset();
    listState = { data: [], isLoading: false };
    trackersState = { data: [], isLoading: false };
  });

  it("shows an empty state when there are no brands", () => {
    render(<BrandList />);
    expect(screen.getByText(/no brands yet/i)).toBeInTheDocument();
  });

  it("lists brands with their discovery status", () => {
    listState = {
      isLoading: false,
      data: [
        brand({
          id: "b1",
          name: "Acme",
          websiteUrl: "https://acme.com",
        }),
      ] as unknown as BrandDto[],
    };
    trackersState = {
      isLoading: false,
      data: [
        tracker({
          trackerId: "t1",
          brandId: "b1",
          brandName: "Acme",
          name: "Acme US",
          status: "Active",
          scanCount: 7,
          latestScanCompletedAt: "2026-06-15T10:00:00Z",
        }),
      ],
    };

    render(<BrandList />);

    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("https://acme.com")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Brand inventory" })).toBeInTheDocument();
    expect(screen.getByText("Acme US")).toBeInTheDocument();
    expect(screen.getByText(/7 scans - last 15 Jun/i)).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
  });

  it("shows a create-tracker callout when a brand has no trackers", () => {
    listState = {
      isLoading: false,
      data: [brand({ id: "b1", name: "Acme" })],
    };

    render(<BrandList />);

    expect(screen.getByText("No trackers yet")).toBeInTheDocument();
    expect(screen.getByText("Create tracker")).toBeInTheDocument();
  });

  it("navigates to add-brand when the button is clicked", async () => {
    render(<BrandList />);
    await userEvent.click(screen.getByRole("button", { name: /add brand/i }));
    expect(navigate).toHaveBeenCalledWith({ to: "/brands/new" });
  });

  it("derives brand tracker inventory", () => {
    const [item] = deriveBrandTrackerInventory(
      [brand({ id: "b1", name: "Acme" })],
      [
        tracker({
          brandId: "b1",
          trackerId: "t2",
          name: "Z Tracker",
          status: "Paused",
          scanCount: 1,
          latestScanCompletedAt: "2026-06-10T00:00:00Z",
        }),
        tracker({
          brandId: "b1",
          trackerId: "t1",
          name: "A Tracker",
          status: "Active",
          scanCount: 3,
          latestScanCompletedAt: "2026-06-12T00:00:00Z",
        }),
      ],
    );

    expect(item.trackers.map((row) => row.name)).toEqual(["A Tracker", "Z Tracker"]);
    expect(item.activeTrackerCount).toBe(1);
    expect(item.totalScanCount).toBe(4);
    expect(item.latestScanCompletedAt).toBe("2026-06-12T00:00:00Z");
  });
});

function brand(overrides: Partial<BrandDto> = {}): BrandDto {
  return {
    id: "b1",
    name: "Acme",
    websiteUrl: "https://acme.com",
    createdAt: "2026-01-01T00:00:00Z",
    latestDiscovery: {
      id: "r1",
      status: "Completed",
      pagesCrawled: 5,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: null,
    },
    ...overrides,
  };
}

function tracker(overrides: Partial<TrackerListItemDto> = {}): TrackerListItemDto {
  return {
    trackerId: "t1",
    name: "Acme US",
    brandId: "b1",
    brandName: "Acme",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
    scanCount: 0,
    latestScanCompletedAt: null,
    ...overrides,
  };
}
