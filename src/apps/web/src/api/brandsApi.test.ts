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

  it("updateAliases PUTs the alias payload to /api/brands/:id/aliases", () => {
    brandsApi.updateAliases("b1", { aliases: ["AcmeCorp", "Acme Inc"] });
    expect(client.put).toHaveBeenCalledWith("/api/brands/b1/aliases", {
      aliases: ["AcmeCorp", "Acme Inc"],
    });
  });

  it("updateProfile PUTs the identity payload to /api/brands/:id/profile", () => {
    const payload = {
      shortDescription: "Career platform",
      industry: "Tech",
      category: null,
      positioning: null,
    };
    brandsApi.updateProfile("b1", payload);
    expect(client.put).toHaveBeenCalledWith("/api/brands/b1/profile", payload);
  });

  it("addTopic POSTs the name to /api/brands/:id/topics", () => {
    brandsApi.addTopic("b1", { name: "Career change" });
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/topics", {
      name: "Career change",
    });
  });

  it("removeTopic DELETEs /api/brands/:id/topics/:topicId", () => {
    brandsApi.removeTopic("b1", "t1");
    expect(client.delete).toHaveBeenCalledWith("/api/brands/b1/topics/t1");
  });
});
