import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PromptList } from "@/types/api";

vi.mock("@/api/promptsApi", () => ({
  promptsApi: {
    list: vi.fn(),
    generate: vi.fn(),
    confirm: vi.fn(),
    remove: vi.fn(),
    addCustom: vi.fn(),
    update: vi.fn(),
  },
}));

import { promptsApi } from "@/api/promptsApi";
import {
  usePrompts,
  useGeneratePrompts,
  useConfirmPrompts,
  useRemovePrompt,
  useAddCustomPrompt,
  useUpdatePrompt,
} from "./usePrompts";

const api = vi.mocked(promptsApi);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe("usePrompts hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usePrompts fetches the prompt list", async () => {
    api.list.mockResolvedValue({
      promptAllocation: 30,
      count: 0,
      brandName: "Acme",
      trackerName: "Acme tracker",
      prompts: [],
      checks: [],
      topics: [],
    } satisfies PromptList);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePrompts("t1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.list).toHaveBeenCalledWith("t1");
  });

  it("usePrompts is disabled without a trackerId", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePrompts(""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("useGeneratePrompts posts with filters and invalidates", async () => {
    api.generate.mockResolvedValue({ count: 5 } as never);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useGeneratePrompts(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ trackerId: "t1", lensId: "c1" });
    });
    expect(api.generate).toHaveBeenCalledWith("t1", {
      lensId: "c1",
      topicId: undefined,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["prompts", "t1"] });
  });

  it("useConfirmPrompts posts and invalidates", async () => {
    api.confirm.mockResolvedValue({ activatedCount: 5 } as never);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useConfirmPrompts("t1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(api.confirm).toHaveBeenCalledWith("t1");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["prompts", "t1"] });
  });

  it("useRemovePrompt deletes and invalidates", async () => {
    api.remove.mockResolvedValue(undefined as never);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRemovePrompt("t1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("p1");
    });
    expect(api.remove).toHaveBeenCalledWith("t1", "p1");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["prompts", "t1"] });
  });

  it("useAddCustomPrompt posts and invalidates", async () => {
    api.addCustom.mockResolvedValue(undefined as never);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useAddCustomPrompt("t1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        text: "Q",
        lensId: "c1",
        primaryTopicId: null,
      });
    });
    expect(api.addCustom).toHaveBeenCalledWith("t1", {
      text: "Q",
      lensId: "c1",
      primaryTopicId: null,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["prompts", "t1"] });
  });

  it("useUpdatePrompt puts and invalidates", async () => {
    api.update.mockResolvedValue(undefined as never);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdatePrompt("t1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ promptId: "p1", text: "Edited" });
    });
    expect(api.update).toHaveBeenCalledWith("t1", "p1", { text: "Edited" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["prompts", "t1"] });
  });
});
