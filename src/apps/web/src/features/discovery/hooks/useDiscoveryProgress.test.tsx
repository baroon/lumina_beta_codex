import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useSignalR", () => ({ useSignalR: vi.fn() }));
vi.mock("@/api/brandsApi", () => ({ brandsApi: { getById: vi.fn() } }));

import { useSignalR } from "@/hooks/useSignalR";
import { brandsApi } from "@/api/brandsApi";
import { useDiscoveryProgress } from "./useDiscoveryProgress";

const signalRMock = vi.mocked(useSignalR);
const api = vi.mocked(brandsApi);

type SignalRReturn = ReturnType<typeof useSignalR>;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
  signalRMock.mockReturnValue({
    connectionState: "Disconnected",
    joinBrandGroup: vi.fn(),
    onProgress: vi.fn(() => () => {}),
  } as SignalRReturn);
  api.getById.mockResolvedValue({ latestDiscovery: null } as never);
});

describe("useDiscoveryProgress", () => {
  it("reflects the polled discovery status", async () => {
    api.getById.mockResolvedValue({ latestDiscovery: { status: "Crawling" } } as never);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDiscoveryProgress("b1"), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("Crawling"));
  });

  it("joins the brand group once connected", async () => {
    const joinBrandGroup = vi.fn();
    signalRMock.mockReturnValue({
      connectionState: "Connected",
      joinBrandGroup,
      onProgress: vi.fn(() => () => {}),
    } as SignalRReturn);
    const { wrapper } = createWrapper();
    renderHook(() => useDiscoveryProgress("b1"), { wrapper });
    await waitFor(() => expect(joinBrandGroup).toHaveBeenCalledWith("b1"));
  });

  it("applies a SignalR progress message and invalidates on a terminal status", async () => {
    let captured: (msg: unknown) => void = () => {};
    const onProgress = vi.fn((cb: (msg: unknown) => void) => {
      captured = cb;
      return () => {};
    });
    signalRMock.mockReturnValue({
      connectionState: "Connected",
      joinBrandGroup: vi.fn(),
      onProgress,
    } as SignalRReturn);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDiscoveryProgress("b1"), { wrapper });
    await waitFor(() => expect(onProgress).toHaveBeenCalled());

    act(() => {
      captured({
        brandId: "b1",
        status: "AwaitingConfirmation",
        message: "Ready",
        step: 5,
        totalSteps: 5,
      });
    });

    expect(result.current.status).toBe("AwaitingConfirmation");
    expect(result.current.message).toBe("Ready");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["discovery", "b1"] });
  });

  it("invalidates when the polled status is terminal", async () => {
    api.getById.mockResolvedValue({ latestDiscovery: { status: "Completed" } } as never);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDiscoveryProgress("b1"), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("Completed"));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["discovery", "b1"] });
  });
});
