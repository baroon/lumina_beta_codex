import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanStatus } from "@/types/api";

vi.mock("@/api/scansApi", () => ({
  scansApi: { run: vi.fn(), latest: vi.fn() },
}));

import { scansApi } from "@/api/scansApi";
import { useRunScan, useLatestScan } from "./useScans";

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

describe("useScans hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useRunScan posts a run", async () => {
    api.run.mockResolvedValue({ scanRunId: "s1", scanCheckCount: 4 });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRunScan("t1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(api.run).toHaveBeenCalledWith("t1");
  });

  it("useLatestScan fetches the latest scan when enabled", async () => {
    api.latest.mockResolvedValue({
      scanRunId: "s1",
      status: "Completed",
      triggerType: "Manual",
      scanCheckCount: 4,
      completedCount: 4,
      failedCount: 0,
      startedAt: "x",
      completedAt: null,
    } as ScanStatus);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLatestScan("t1", true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.latest).toHaveBeenCalledWith("t1");
  });
});
