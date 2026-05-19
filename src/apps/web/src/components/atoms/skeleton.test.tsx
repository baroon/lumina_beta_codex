import { render, screen } from "@testing-library/react";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a div", () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("applies animate-pulse class", () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse");
  });

  it("merges custom className", () => {
    render(<Skeleton data-testid="skeleton" className="h-8 w-64" />);
    const el = screen.getByTestId("skeleton");
    expect(el).toHaveClass("animate-pulse");
    expect(el).toHaveClass("h-8");
    expect(el).toHaveClass("w-64");
  });
});
