import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CreateTrackerResponse, TrackerSetupPreview } from "@/types/api";

vi.mock("@/api/trackersApi", () => ({
  trackersApi: {
    getSetupPreview: vi.fn(),
    create: vi.fn(),
  },
}));

import { trackersApi } from "@/api/trackersApi";
import { useTrackerSetupPreview, useCreateTracker } from "./useTrackers";

const api = vi.mocked(trackersApi);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe("useTrackers hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useTrackerSetupPreview fetches the preview for the brand", async () => {
    const preview = { brandId: "b1", suggestedName: "X" } as TrackerSetupPreview;
    api.getSetupPreview.mockResolvedValue(preview);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTrackerSetupPreview("b1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getSetupPreview).toHaveBeenCalledWith("b1");
    expect(result.current.data).toEqual(preview);
  });

  it("useTrackerSetupPreview is disabled without a brandId", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTrackerSetupPreview(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(api.getSetupPreview).not.toHaveBeenCalled();
  });

  it("useCreateTracker posts and invalidates the trackers query", async () => {
    api.create.mockResolvedValue({ trackerId: "t1", name: "My Tracker" } as CreateTrackerResponse);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateTracker("b1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "My Tracker" });
    });

    expect(api.create).toHaveBeenCalledWith("b1", { name: "My Tracker" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["trackers", "b1"] });
  });
});
