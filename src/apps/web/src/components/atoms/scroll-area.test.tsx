import { render, screen } from "@testing-library/react";
import { ScrollArea } from "./scroll-area";

describe("ScrollArea", () => {
  it("renders children", () => {
    render(<ScrollArea>Scrollable content</ScrollArea>);
    expect(screen.getByText("Scrollable content")).toBeInTheDocument();
  });

  it("applies overflow-auto class", () => {
    render(<ScrollArea data-testid="scroll-area">Content</ScrollArea>);
    expect(screen.getByTestId("scroll-area")).toHaveClass("overflow-auto");
  });
});
