import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Package } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

describe("SectionHeader", () => {
  it("renders the title and description", () => {
    render(<SectionHeader title="Products" description="Your offerings" />);
    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByText("Your offerings")).toBeInTheDocument();
  });

  it("renders meta and actions slots", () => {
    render(
      <SectionHeader title="Products" meta={<span>3/6</span>} actions={<button>Refresh</button>} />,
    );
    expect(screen.getByText("3/6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("renders a leading icon when provided", () => {
    const { container } = render(<SectionHeader icon={Package} title="Products" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
