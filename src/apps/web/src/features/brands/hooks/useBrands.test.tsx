import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BrandDto, CreateBrandResponse } from "@/types/api";

vi.mock("@/api/brandsApi", () => ({
  brandsApi: {
    getById: vi.fn(),
    create: vi.fn(),
  },
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

import { brandsApi } from "@/api/brandsApi";
import { useBrand, useCreateBrand } from "./useBrands";

const api = vi.mocked(brandsApi);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe("useBrands hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useBrand fetches a brand by id", async () => {
    const brand = { id: "b1", name: "Test" } as BrandDto;
    api.getById.mockResolvedValue(brand);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBrand("b1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getById).toHaveBeenCalledWith("b1");
    expect(result.current.data).toEqual(brand);
  });

  it("useBrand is disabled without an id", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBrand(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(api.getById).not.toHaveBeenCalled();
  });

  it("useCreateBrand creates a brand, invalidates the list, and navigates to discovery", async () => {
    const response = { brandId: "b9", discoveryRunId: "r1" } as CreateBrandResponse;
    api.create.mockResolvedValue(response);
    const { wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateBrand(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "Acme", websiteUrl: "https://acme.com" });
    });

    expect(api.create).toHaveBeenCalledWith({ name: "Acme", websiteUrl: "https://acme.com" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["brands"] });
    expect(navigate).toHaveBeenCalledWith({
      to: "/brands/$brandId/discovery",
      params: { brandId: "b9" },
    });
  });
});
