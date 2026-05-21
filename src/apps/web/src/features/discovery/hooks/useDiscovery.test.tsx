import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { DiscoveryResultsDto } from "@/types/api";

vi.mock("@/api/discoveryApi", () => ({
  discoveryApi: {
    getResults: vi.fn(),
    confirm: vi.fn(),
    resuggest: vi.fn(),
    regenerateLens: vi.fn(),
  },
}));

import { discoveryApi } from "@/api/discoveryApi";
import {
  useDiscoveryResults,
  useConfirmDiscovery,
  useResuggestDiscovery,
  useRegenerateLens,
} from "./useDiscovery";

const api = vi.mocked(discoveryApi);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe("useDiscovery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useDiscoveryResults fetches results for the brand", async () => {
    const data = { brandId: "b1", brandName: "Test" } as DiscoveryResultsDto;
    api.getResults.mockResolvedValue(data);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDiscoveryResults("b1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getResults).toHaveBeenCalledWith("b1");
    expect(result.current.data).toEqual(data);
  });

  it("useDiscoveryResults is disabled without a brandId", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDiscoveryResults(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(api.getResults).not.toHaveBeenCalled();
  });

  it("useConfirmDiscovery confirms and invalidates the discovery + brand queries", async () => {
    api.confirm.mockResolvedValue(undefined);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useConfirmDiscovery("b1"), { wrapper });
    const payload = {} as never;
    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(api.confirm).toHaveBeenCalledWith("b1", payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["discovery", "b1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["brands", "b1"] });
  });

  it("useResuggestDiscovery calls the resuggest API", async () => {
    api.resuggest.mockResolvedValue({} as never);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useResuggestDiscovery("b1"), { wrapper });
    const payload = {} as never;
    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(api.resuggest).toHaveBeenCalledWith("b1", payload);
  });

  it("useRegenerateLens calls the regenerate-lens API", async () => {
    api.regenerateLens.mockResolvedValue({} as never);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useRegenerateLens("b1"), { wrapper });
    const payload = {} as never;
    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(api.regenerateLens).toHaveBeenCalledWith("b1", payload);
  });
});
