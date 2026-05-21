import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatPercent } from "./formatters";

describe("formatters", () => {
  it("formatDate renders 'Mon D, YYYY' from an ISO string", () => {
    // Local-time literal (no trailing Z) keeps the result timezone-stable.
    expect(formatDate("2026-05-21T12:00:00")).toBe("May 21, 2026");
  });

  it("formatDate accepts a Date object", () => {
    expect(formatDate(new Date(2026, 0, 2, 12))).toBe("Jan 2, 2026");
  });

  it("formatDateTime includes both the date and the time", () => {
    const result = formatDateTime("2026-05-21T14:30:00");
    expect(result).toContain("May 21, 2026");
    expect(result).toContain("2:30");
    expect(result).toMatch(/PM/i);
  });

  it("formatPercent renders a whole-number percentage", () => {
    expect(formatPercent(0.42)).toBe("42%");
    expect(formatPercent(0.4208)).toBe("42%");
    expect(formatPercent(1)).toBe("100%");
  });
});
