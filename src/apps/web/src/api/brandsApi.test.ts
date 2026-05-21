import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateBrandRequest } from "@/types/api";

vi.mock("./apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "./apiClient";
import { brandsApi } from "./brandsApi";

const client = vi.mocked(apiClient);

describe("brandsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create POSTs to /api/brands with the payload", () => {
    const payload = {} as CreateBrandRequest;
    brandsApi.create(payload);
    expect(client.post).toHaveBeenCalledWith("/api/brands", payload);
  });

  it("getById GETs /api/brands/:id", () => {
    brandsApi.getById("b1");
    expect(client.get).toHaveBeenCalledWith("/api/brands/b1");
  });
});
