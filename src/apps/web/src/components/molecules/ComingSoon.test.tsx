import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MessageSquare } from "lucide-react";
import { ComingSoon } from "./ComingSoon";

describe("ComingSoon", () => {
  it("renders the title", () => {
    render(<ComingSoon title="Prompts" />);
    expect(screen.getByRole("heading", { name: "Prompts" })).toBeInTheDocument();
  });

  it("renders 'Coming soon' caption", () => {
    render(<ComingSoon title="Prompts" />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<ComingSoon title="Prompts" description="Per-prompt analysis." />);
    expect(screen.getByText("Per-prompt analysis.")).toBeInTheDocument();
  });

  it("renders no description text when omitted", () => {
    render(<ComingSoon title="Prompts" />);
    // No paragraph above the "Coming soon" caption.
    expect(screen.queryByText("Per-prompt analysis.")).not.toBeInTheDocument();
  });

  it("renders the icon when provided", () => {
    const { container } = render(<ComingSoon title="Prompts" icon={MessageSquare} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders the Beta badge when beta=true", () => {
    render(<ComingSoon title="Insights" beta />);
    expect(screen.getByText(/^beta$/i)).toBeInTheDocument();
  });

  it("does not render the Beta badge when beta is false or omitted", () => {
    render(<ComingSoon title="Prompts" />);
    expect(screen.queryByText(/^beta$/i)).not.toBeInTheDocument();
  });
});
