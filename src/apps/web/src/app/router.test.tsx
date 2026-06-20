import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "./router";

const legacyRedirects = [
  ["/prompts", "/ai-questions"],
  ["/insights", "/recommendations"],
  ["/scans", "/scan-history"],
] as const;

describe("router legacy redirects", () => {
  it.each(legacyRedirects)("redirects %s to %s", async (from, to) => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [from] }),
    });

    await router.load();

    expect(router.state.location.pathname).toBe(to);
  });
});
