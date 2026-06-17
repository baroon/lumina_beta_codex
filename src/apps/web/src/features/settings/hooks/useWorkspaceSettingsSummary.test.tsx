import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { brandsApi } from "@/api/brandsApi";
import { trackersApi } from "@/api/trackersApi";
import type { BrandDto, TrackerListItemDto } from "@/types/api";
import { useWorkspaceSettingsSummary } from "./useWorkspaceSettingsSummary";

vi.mock("@/api/brandsApi", () => ({
  brandsApi: {
    list: vi.fn(),
  },
}));

vi.mock("@/api/trackersApi", () => ({
  trackersApi: {
    list: vi.fn(),
  },
}));

const brandsList = vi.mocked(brandsApi.list);
const trackersList = vi.mocked(trackersApi.list);

describe("useWorkspaceSettingsSummary", () => {
  it("summarizes brand and tracker usage", async () => {
    brandsList.mockResolvedValue([brand("b1"), brand("b2")]);
    trackersList.mockResolvedValue([
      tracker("t1", "Active", 4),
      tracker("t2", "Paused", 1),
      tracker("t3", "Active", 2),
    ]);

    const { result } = renderHook(() => useWorkspaceSettingsSummary(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.summary).toEqual({
      brandCount: 2,
      trackerCount: 3,
      activeTrackerCount: 2,
      completedScanCount: 7,
    });
  });
});

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function brand(id: string): BrandDto {
  return {
    id,
    name: id,
    websiteUrl: "https://example.com",
    createdAt: "2026-06-01T00:00:00Z",
    latestDiscovery: null,
  };
}

function tracker(id: string, status: string, scanCount: number): TrackerListItemDto {
  return {
    trackerId: id,
    name: id,
    brandId: "b1",
    brandName: "Acme",
    status,
    createdAt: "2026-06-01T00:00:00Z",
    scanCount,
    latestScanCompletedAt: null,
  };
}
