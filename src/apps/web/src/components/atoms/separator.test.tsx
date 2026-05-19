import { render, screen } from "@testing-library/react";
import { Separator } from "./separator";

describe("Separator", () => {
  it("renders horizontal orientation by default", () => {
    render(<Separator data-testid="sep" />);
    expect(screen.getByTestId("sep")).toHaveClass("w-full");
  });

  it("renders vertical orientation", () => {
    render(<Separator orientation="vertical" data-testid="sep" />);
    expect(screen.getByTestId("sep")).toHaveClass("h-full");
  });

  it("sets role='none' when decorative is true", () => {
    render(<Separator decorative={true} />);
    expect(screen.getByRole("none")).toBeInTheDocument();
  });

  it("sets role='separator' when decorative is false", () => {
    render(<Separator decorative={false} />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("sets aria-orientation when decorative is false", () => {
    render(<Separator decorative={false} orientation="horizontal" />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("sets aria-orientation to vertical when decorative is false", () => {
    render(<Separator decorative={false} orientation="vertical" />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });
});
