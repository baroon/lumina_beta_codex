import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TrackerScheduleSetup } from "@/types/api";

vi.mock("@/api/trackerScheduleApi", () => ({
  trackerScheduleApi: { getSetup: vi.fn(), configure: vi.fn() },
}));

import { trackerScheduleApi } from "@/api/trackerScheduleApi";
import { useTrackerScheduleSetup, useConfigureTrackerSchedule } from "./useTrackerSchedule";

const api = vi.mocked(trackerScheduleApi);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe("useTrackerSchedule hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useTrackerScheduleSetup fetches setup", async () => {
    api.getSetup.mockResolvedValue({
      trackerId: "t1",
      trackerName: "Acme",
      cadence: "Weekly",
      activePromptCount: 0,
      platforms: [],
      selectedPlatformIds: [],
    } as TrackerScheduleSetup);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTrackerScheduleSetup("t1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getSetup).toHaveBeenCalledWith("t1");
  });

  it("useConfigureTrackerSchedule puts and invalidates", async () => {
    api.configure.mockResolvedValue({ scanCheckCount: 4, cadence: "Weekly" } as never);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useConfigureTrackerSchedule("t1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ platformIds: ["p1"], cadence: "Weekly", timezone: null });
    });

    expect(api.configure).toHaveBeenCalledWith("t1", {
      platformIds: ["p1"],
      cadence: "Weekly",
      timezone: null,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tracker-schedule", "t1"] });
  });
});
