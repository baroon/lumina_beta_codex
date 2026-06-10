import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TrackerListItemDto } from "@/types/api";

vi.mock("@/api/trackersApi", () => ({
  trackersApi: {
    list: vi.fn(),
    getSetupPreview: vi.fn(),
    create: vi.fn(),
  },
}));

import { trackersApi } from "@/api/trackersApi";
import { groupTrackersByBrand, useBrandsWithTrackers } from "./useBrandsWithTrackers";

const api = vi.mocked(trackersApi);

function row(overrides: Partial<TrackerListItemDto>): TrackerListItemDto {
  return {
    trackerId: "t-x",
    name: "Tracker X",
    brandId: "b-x",
    brandName: "Brand X",
    status: "Active",
    createdAt: "2026-06-01T00:00:00Z",
    scanCount: 0,
    latestScanCompletedAt: null,
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe("groupTrackersByBrand (pure)", () => {
  it("returns [] for an empty list", () => {
    expect(groupTrackersByBrand([])).toEqual([]);
  });

  it("groups trackers under their parent brand", () => {
    const result = groupTrackersByBrand([
      row({
        trackerId: "t1",
        name: "Acme · US",
        brandId: "b-acme",
        brandName: "Acme",
        scanCount: 3,
      }),
      row({
        trackerId: "t2",
        name: "BOLD · Docs",
        brandId: "b-bold",
        brandName: "BOLD",
        scanCount: 0,
      }),
      row({
        trackerId: "t3",
        name: "Acme · EU",
        brandId: "b-acme",
        brandName: "Acme",
        scanCount: 1,
      }),
    ]);

    expect(result).toHaveLength(2);
    // Brands sorted alphabetically — Acme before BOLD.
    expect(result.map((g) => g.brandName)).toEqual(["Acme", "BOLD"]);
    // Trackers within each brand sorted alphabetically.
    expect(result[0].trackers.map((t) => t.name)).toEqual(["Acme · EU", "Acme · US"]);
    expect(result[1].trackers.map((t) => t.name)).toEqual(["BOLD · Docs"]);
  });

  it("marks hasScans true when scanCount is non-zero", () => {
    const [acme] = groupTrackersByBrand([
      row({ trackerId: "t1", brandId: "b-acme", brandName: "Acme", scanCount: 0 }),
      row({ trackerId: "t2", brandId: "b-acme", brandName: "Acme", scanCount: 5 }),
    ]);
    const byId = Object.fromEntries(acme.trackers.map((t) => [t.id, t]));
    expect(byId["t1"].hasScans).toBe(false);
    expect(byId["t2"].hasScans).toBe(true);
  });
});

describe("useBrandsWithTrackers (hook)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the grouped brand tree from the workspace tracker list", async () => {
    api.list.mockResolvedValue([
      row({ trackerId: "t1", name: "US", brandId: "b-acme", brandName: "Acme", scanCount: 2 }),
      row({ trackerId: "t2", name: "Docs", brandId: "b-bold", brandName: "BOLD", scanCount: 0 }),
    ]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBrandsWithTrackers(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.list).toHaveBeenCalledOnce();
    expect(result.current.brands).toHaveLength(2);
    expect(result.current.brands[0].brandName).toBe("Acme");
    expect(result.current.brands[0].trackers[0].hasScans).toBe(true);
    expect(result.current.brands[1].trackers[0].hasScans).toBe(false);
  });

  it("returns an empty brands list while loading", () => {
    api.list.mockReturnValue(new Promise(() => {})); // never resolves
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBrandsWithTrackers(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.brands).toEqual([]);
  });

  it("returns an empty brands list on error", async () => {
    api.list.mockRejectedValue(new Error("boom"));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBrandsWithTrackers(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.brands).toEqual([]);
  });
});
