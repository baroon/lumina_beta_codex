import { render, screen } from "@testing-library/react";
import { TrendingUp } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ChartCardHeader } from "./ChartCardHeader";

describe("ChartCardHeader", () => {
  it("renders the title", () => {
    render(<ChartCardHeader icon={TrendingUp} title="Visibility" />);
    expect(screen.getByRole("heading", { name: "Visibility" })).toBeInTheDocument();
  });

  it("renders the subtitle when provided", () => {
    render(
      <ChartCardHeader icon={TrendingUp} title="Visibility" subtitle="Trend over the window" />,
    );
    expect(screen.getByText("Trend over the window")).toBeInTheDocument();
  });

  it("hides the info button when no tooltip copy is provided", () => {
    render(<ChartCardHeader icon={TrendingUp} title="Visibility" />);
    expect(screen.queryByRole("button", { name: /About Visibility/i })).toBeNull();
  });

  it("renders the info button when tooltip copy is provided", () => {
    render(
      <ChartCardHeader icon={TrendingUp} title="Visibility" tooltip="What this chart shows." />,
    );
    expect(screen.getByRole("button", { name: /About Visibility/i })).toBeInTheDocument();
  });

  it("renders the actions slot when supplied", () => {
    render(
      <ChartCardHeader
        icon={TrendingUp}
        title="Visibility"
        actions={<a href="#more">View all</a>}
      />,
    );
    expect(screen.getByRole("link", { name: "View all" })).toBeInTheDocument();
  });
});
