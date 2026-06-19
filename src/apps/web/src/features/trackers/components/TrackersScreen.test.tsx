import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrackerListItemDto } from "@/types/api";
import { deriveTrackerAttentionItems } from "@/features/trackers/trackers";

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
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, value);
      }
    }
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

let trackersState: {
  data?: TrackerListItemDto[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: ReturnType<typeof vi.fn>;
};

vi.mock("@/features/trackers/hooks/useAllTrackers", () => ({
  useAllTrackers: () => trackersState,
}));

import { TrackersScreen } from "./TrackersScreen";

function tracker(overrides: Partial<TrackerListItemDto> = {}): TrackerListItemDto {
  return {
    trackerId: "t1",
    name: "Acme US Tracker",
    brandId: "b1",
    brandName: "Acme",
    status: "Active",
    createdAt: "2026-06-01T00:00:00Z",
    scanCount: 3,
    latestScanCompletedAt: "2026-06-10T08:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  trackersState = {
    data: [
      tracker(),
      tracker({
        trackerId: "t2",
        name: "Acme UK Tracker",
        status: "Paused",
        scanCount: 1,
        latestScanCompletedAt: null,
      }),
      tracker({
        trackerId: "t3",
        name: "Bold Docs Tracker",
        brandId: "b2",
        brandName: "Bold",
        status: "Draft",
        scanCount: 0,
        latestScanCompletedAt: null,
      }),
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
});

describe("TrackersScreen", () => {
  it("renders tracker summary tiles and brand coverage", () => {
    render(<TrackersScreen />);

    expect(screen.getByRole("heading", { name: "Trackers" })).toBeInTheDocument();
    expect(screen.getByText("Total trackers")).toBeInTheDocument();
    expect(screen.getByText("Active trackers")).toBeInTheDocument();
    expect(screen.getByText("Brands monitored")).toBeInTheDocument();
    expect(screen.getByText("Completed scans")).toBeInTheDocument();
    expect(screen.getAllByText("Acme").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bold").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1 active")).toBeInTheDocument();
  });

  it("links tracker rows to the tracker hub and brand profile", () => {
    render(<TrackersScreen />);

    expect(screen.getByRole("link", { name: "Acme US Tracker" })).toHaveAttribute(
      "href",
      "/brands/b1/trackers/t1",
    );
    expect(screen.getAllByRole("link", { name: "Acme" })[0]).toHaveAttribute(
      "href",
      "/brands/b1/profile",
    );
  });

  it("renders status badges and scan dates", () => {
    render(<TrackersScreen />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Active")).toBeInTheDocument();
    expect(within(table).getByText("Paused")).toBeInTheDocument();
    expect(within(table).getByText("Draft")).toBeInTheDocument();
    expect(within(table).getAllByText("Never scanned").length).toBeGreaterThanOrEqual(1);
  });

  it("renders tracker attention cards with action links", () => {
    render(<TrackersScreen />);

    const attention = screen.getByRole("region", { name: "Tracker attention" });
    expect(within(attention).getByText("Acme UK Tracker")).toBeInTheDocument();
    expect(within(attention).getByText("Bold Docs Tracker")).toBeInTheDocument();
    expect(within(attention).getByText("Activate tracker")).toHaveAttribute(
      "href",
      "/brands/b2/trackers/t3",
    );
    expect(within(attention).getByText("Resume tracker")).toHaveAttribute(
      "href",
      "/brands/b1/trackers/t2",
    );
  });

  it("derives prioritized tracker attention items", () => {
    const items = deriveTrackerAttentionItems([
      tracker({ trackerId: "healthy" }),
      tracker({
        trackerId: "paused",
        name: "Paused Tracker",
        status: "Paused",
        latestScanCompletedAt: null,
      }),
      tracker({
        trackerId: "draft",
        name: "Draft Tracker",
        status: "Draft",
        scanCount: 0,
        latestScanCompletedAt: null,
      }),
    ]);

    expect(items.map((item) => item.trackerId)).toEqual(["draft", "paused"]);
    expect(items[0]).toMatchObject({
      priority: "High",
      action: "Activate tracker",
    });
    expect(items[1]).toMatchObject({
      priority: "Medium",
      action: "Resume tracker",
    });
  });

  it("renders the empty state when no trackers exist", () => {
    trackersState = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    render(<TrackersScreen />);

    expect(screen.getAllByText(/No trackers yet/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the shared error state when the list fails", () => {
    trackersState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network unavailable"),
      refetch: vi.fn(),
    };
    render(<TrackersScreen />);

    expect(screen.getByText("Network unavailable")).toBeInTheDocument();
  });
});
