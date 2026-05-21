import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("skips falsy values", () => {
    expect(cn("a", false, null, undefined, "", "c")).toBe("a c");
  });

  it("dedupes conflicting Tailwind classes so the last one wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-neutral-400", "text-neutral-600")).toBe("text-neutral-600");
  });
});
