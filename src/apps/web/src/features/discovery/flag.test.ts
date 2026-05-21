import { describe, it, expect } from "vitest";
import { countryCodeToFlagUrl } from "./flag";

describe("countryCodeToFlagUrl", () => {
  it("builds a flagcdn URL for a valid alpha-2 code (case-insensitive)", () => {
    expect(countryCodeToFlagUrl("US")).toBe("https://flagcdn.com/us.svg");
    expect(countryCodeToFlagUrl("gb")).toBe("https://flagcdn.com/gb.svg");
  });

  it("returns null for missing or invalid codes", () => {
    expect(countryCodeToFlagUrl(null)).toBeNull();
    expect(countryCodeToFlagUrl(undefined)).toBeNull();
    expect(countryCodeToFlagUrl("")).toBeNull();
    expect(countryCodeToFlagUrl("USA")).toBeNull();
    expect(countryCodeToFlagUrl("1")).toBeNull();
  });
});
