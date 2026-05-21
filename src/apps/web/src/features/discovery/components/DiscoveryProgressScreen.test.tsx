import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiscoveryProgressScreen } from "./DiscoveryProgressScreen";

describe("DiscoveryProgressScreen", () => {
  it("renders the discovery title, subtitle, and step progress", () => {
    render(<DiscoveryProgressScreen step={1} totalSteps={5} />);
    expect(screen.getByText("Discovering your brand")).toBeInTheDocument();
    expect(screen.getByText("Crawling website")).toBeInTheDocument();
  });
});
