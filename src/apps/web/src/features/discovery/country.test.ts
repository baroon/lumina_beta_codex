import { describe, it, expect } from "vitest";
import { resolveCountryCode } from "./country";

describe("resolveCountryCode", () => {
  it("resolves country names and common aliases to ISO codes", () => {
    expect(resolveCountryCode("France")).toBe("FR");
    expect(resolveCountryCode("united states")).toBe("US");
    expect(resolveCountryCode("USA")).toBe("US");
    expect(resolveCountryCode("UK")).toBe("GB");
    expect(resolveCountryCode("Germany")).toBe("DE");
  });

  it("accepts a raw ISO alpha-2 code", () => {
    expect(resolveCountryCode("fr")).toBe("FR");
  });

  it("returns null for regions, blanks, and unknown names", () => {
    expect(resolveCountryCode("Europe")).toBeNull();
    expect(resolveCountryCode("")).toBeNull();
    expect(resolveCountryCode(null)).toBeNull();
    expect(resolveCountryCode("Narnia")).toBeNull();
  });
});
