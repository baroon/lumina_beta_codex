import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanListItemDto } from "@/types/api";

vi.mock("@/api/scansApi", () => ({
  scansApi: { run: vi.fn(), latest: vi.fn(), results: vi.fn(), list: vi.fn() },
}));

import { scansApi } from "@/api/scansApi";
import { useAllScans } from "./useAllScans";

const api = vi.mocked(scansApi);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

const ROWS: ScanListItemDto[] = [
  {
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
  },
];

describe("useAllScans", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches the cross-tracker scan list", async () => {
    api.list.mockResolvedValue(ROWS);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAllScans(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.list).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(ROWS);
  });
});
