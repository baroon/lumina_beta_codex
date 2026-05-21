import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ManualFallbackPrompt } from "./ManualFallbackPrompt";

describe("ManualFallbackPrompt", () => {
  it("renders the fallback title and the provided message", () => {
    render(<ManualFallbackPrompt message="Crawl failed, add manually" />);
    expect(screen.getByText("No items detected")).toBeInTheDocument();
    expect(screen.getByText("Crawl failed, add manually")).toBeInTheDocument();
  });
});
