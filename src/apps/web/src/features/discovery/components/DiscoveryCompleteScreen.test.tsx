import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiscoveryCompleteScreen } from "./DiscoveryCompleteScreen";

describe("DiscoveryCompleteScreen", () => {
  it("renders the completion title and interpolates the brand name", () => {
    render(<DiscoveryCompleteScreen brandName="Acme" brandId="b1" />);
    expect(screen.getByText("Discovery complete")).toBeInTheDocument();
    expect(screen.getByText(/profile for Acme/)).toBeInTheDocument();
  });

  it("shows a disabled create-tracker button and a coming-soon note", () => {
    render(<DiscoveryCompleteScreen brandName="Acme" brandId="b1" />);
    expect(screen.getByRole("button", { name: /create visibility tracker/i })).toBeDisabled();
    expect(screen.getByText("Tracker setup is coming soon.")).toBeInTheDocument();
  });
});
