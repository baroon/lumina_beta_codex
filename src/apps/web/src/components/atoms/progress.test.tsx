import { render, screen } from "@testing-library/react";
import { Progress } from "./progress";

describe("Progress", () => {
  it("renders with role='progressbar'", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("sets aria-valuenow to the provided value", () => {
    render(<Progress value={75} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "75");
  });

  it("sets aria-valuemin to 0", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemin", "0");
  });

  it("sets aria-valuemax to 100 by default", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "100");
  });

  it("sets aria-valuemax to custom max", () => {
    render(<Progress value={50} max={200} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "200");
  });

  it("renders default color variant", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders success variant", () => {
    render(<Progress value={50} variant="success" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders warning variant", () => {
    render(<Progress value={50} variant="warning" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders error variant", () => {
    render(<Progress value={50} variant="error" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders sm size", () => {
    render(<Progress value={50} progressSize="sm" />);
    expect(screen.getByRole("progressbar")).toHaveClass("h-2");
  });

  it("renders default size", () => {
    render(<Progress value={50} progressSize="default" />);
    expect(screen.getByRole("progressbar")).toHaveClass("h-4");
  });

  it("renders lg size", () => {
    render(<Progress value={50} progressSize="lg" />);
    expect(screen.getByRole("progressbar")).toHaveClass("h-6");
  });

  it("clamps percentage to 100", () => {
    const { container } = render(<Progress value={150} />);
    const indicator = container.querySelector("[class*='h-full']");
    expect(indicator).toHaveStyle({ width: "100%" });
  });
});
