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

  it("addCompetitor POSTs the name to /api/brands/:id/competitors", () => {
    brandsApi.addCompetitor("b1", { name: "Adobe Express" });
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/competitors", {
      name: "Adobe Express",
    });
  });

  it("removeCompetitor DELETEs /api/brands/:id/competitors/:competitorId", () => {
    brandsApi.removeCompetitor("b1", "c1");
    expect(client.delete).toHaveBeenCalledWith("/api/brands/b1/competitors/c1");
  });

  it("delete DELETEs /api/brands/:id", () => {
    brandsApi.delete("b1");
    expect(client.delete).toHaveBeenCalledWith("/api/brands/b1");
  });

  it("addAudience POSTs to /api/brands/:id/audiences", () => {
    brandsApi.addAudience("b1", { name: "HR" });
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/audiences", { name: "HR" });
  });

  it("removeAudience DELETEs /api/brands/:id/audiences/:audienceId", () => {
    brandsApi.removeAudience("b1", "a1");
    expect(client.delete).toHaveBeenCalledWith("/api/brands/b1/audiences/a1");
  });

  it("addMarket POSTs to /api/brands/:id/markets", () => {
    brandsApi.addMarket("b1", { name: "DE" });
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/markets", { name: "DE" });
  });

  it("removeMarket DELETEs /api/brands/:id/markets/:marketId", () => {
    brandsApi.removeMarket("b1", "m1");
    expect(client.delete).toHaveBeenCalledWith("/api/brands/b1/markets/m1");
  });

  it("addProduct POSTs to /api/brands/:id/products", () => {
    brandsApi.addProduct("b1", { name: "Pro" });
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/products", { name: "Pro" });
  });

  it("removeProduct DELETEs /api/brands/:id/products/:productId", () => {
    brandsApi.removeProduct("b1", "p1");
    expect(client.delete).toHaveBeenCalledWith("/api/brands/b1/products/p1");
  });

  it("addTrustSignal POSTs to /api/brands/:id/trust-signals", () => {
    brandsApi.addTrustSignal("b1", { name: "Webby" });
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/trust-signals", { name: "Webby" });
  });

  it("removeTrustSignal DELETEs /api/brands/:id/trust-signals/:trustSignalId", () => {
    brandsApi.removeTrustSignal("b1", "ts1");
    expect(client.delete).toHaveBeenCalledWith("/api/brands/b1/trust-signals/ts1");
  });
});
