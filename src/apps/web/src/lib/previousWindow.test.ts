import { describe, it, expect } from "vitest";
import { previousSelectionFor } from "./previousWindow";

describe("previousSelectionFor", () => {
  it("shifts a preset window back by N days into a custom range", () => {
    const result = previousSelectionFor({ kind: "preset", days: 30 });
    expect(result.kind).toBe("custom");
    if (result.kind !== "custom") throw new Error("unreachable");
    const widthDays = (result.to.getTime() - result.from.getTime()) / (1000 * 60 * 60 * 24);
    expect(widthDays).toBeGreaterThan(29.99);
    expect(widthDays).toBeLessThan(30.01);
    // `to` should sit roughly 30 days before "now".
    const toAgoDays = (Date.now() - result.to.getTime()) / (1000 * 60 * 60 * 24);
    expect(toAgoDays).toBeGreaterThan(29.99);
    expect(toAgoDays).toBeLessThan(30.01);
  });

  it("shifts a custom window back by the same width immediately before from", () => {
    const from = new Date("2026-06-01T00:00:00Z");
    const to = new Date("2026-06-15T00:00:00Z");
    expect(previousSelectionFor({ kind: "custom", from, to })).toEqual({
      kind: "custom",
      from: new Date("2026-05-18T00:00:00Z"),
      to: new Date("2026-06-01T00:00:00Z"),
    });
  });

  it("returns 'all' unchanged — no meaningful previous window for all-time", () => {
    expect(previousSelectionFor({ kind: "all" })).toEqual({ kind: "all" });
  });
});
