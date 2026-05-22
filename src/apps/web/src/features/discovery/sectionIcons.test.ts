import { describe, it, expect } from "vitest";
import { SECTION_ICONS } from "./sectionIcons";

describe("SECTION_ICONS", () => {
  it("provides an icon for every discovery section", () => {
    for (const key of [
      "brandProfile",
      "products",
      "audiences",
      "markets",
      "topics",
      "competitors",
      "trustSignals",
    ]) {
      expect(SECTION_ICONS[key]).toBeDefined();
    }
  });
});
