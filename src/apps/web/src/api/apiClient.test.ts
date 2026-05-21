import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiError } from "./apiClient";

function makeResponse(opts: {
  ok: boolean;
  status: number;
  data?: unknown;
  text?: string;
  statusText?: string;
}): Response {
  return {
    ok: opts.ok,
    status: opts.status,
    statusText: opts.statusText ?? "",
    json: async () => opts.data,
    text: async () => opts.text ?? "",
  } as Response;
}

describe("apiClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get returns parsed JSON and sends a JSON content-type", async () => {
    fetchMock.mockResolvedValue(makeResponse({ ok: true, status: 200, data: { hello: "world" } }));

    const result = await apiClient.get<{ hello: string }>("/api/test");

    expect(result).toEqual({ hello: "world" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/test"),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("post sends method POST and a JSON-stringified body", async () => {
    fetchMock.mockResolvedValue(makeResponse({ ok: true, status: 200, data: {} }));

    await apiClient.post("/api/test", { a: 1 });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("post without a body sends an undefined body", async () => {
    fetchMock.mockResolvedValue(makeResponse({ ok: true, status: 200, data: {} }));

    await apiClient.post("/api/test");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("returns undefined for a 204 No Content response", async () => {
    fetchMock.mockResolvedValue(makeResponse({ ok: true, status: 204 }));

    const result = await apiClient.delete("/api/test");

    expect(result).toBeUndefined();
  });

  it("throws an ApiError carrying status and body on a non-ok response", async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ ok: false, status: 404, text: "Not found", statusText: "Not Found" }),
    );

    const promise = apiClient.get("/api/missing");

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 404, message: "Not found" });
  });

  it("falls back to statusText when the error body is empty", async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ ok: false, status: 500, text: "", statusText: "Server Error" }),
    );

    await expect(apiClient.put("/api/x", {})).rejects.toMatchObject({
      status: 500,
      message: "Server Error",
    });
  });
});
