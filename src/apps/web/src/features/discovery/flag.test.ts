import { describe, it, expect } from "vitest";
import { countryCodeToFlag } from "./flag";

describe("countryCodeToFlag", () => {
  it("converts a valid alpha-2 code to a flag emoji (case-insensitive)", () => {
    expect(countryCodeToFlag("US")).toBe("🇺🇸");
    expect(countryCodeToFlag("gb")).toBe("🇬🇧");
  });

  it("returns null for missing or invalid codes", () => {
    expect(countryCodeToFlag(null)).toBeNull();
    expect(countryCodeToFlag(undefined)).toBeNull();
    expect(countryCodeToFlag("")).toBeNull();
    expect(countryCodeToFlag("USA")).toBeNull();
    expect(countryCodeToFlag("1")).toBeNull();
  });
});
