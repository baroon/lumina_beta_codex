import { render, screen } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("renders with default variant", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("renders error variant", () => {
    render(<Input variant="error" placeholder="Error input" />);
    const input = screen.getByPlaceholderText("Error input");
    expect(input).toHaveClass("border-semantic-error-500");
  });

  it("renders sm size", () => {
    render(<Input inputSize="sm" placeholder="Small" />);
    expect(screen.getByPlaceholderText("Small")).toHaveClass("h-8");
  });

  it("renders default size", () => {
    render(<Input inputSize="default" placeholder="Default" />);
    expect(screen.getByPlaceholderText("Default")).toHaveClass("h-10");
  });

  it("renders lg size", () => {
    render(<Input inputSize="lg" placeholder="Large" />);
    expect(screen.getByPlaceholderText("Large")).toHaveClass("h-12");
  });

  it("applies placeholder text", () => {
    render(<Input placeholder="Type here..." />);
    expect(screen.getByPlaceholderText("Type here...")).toBeInTheDocument();
  });

  it("is disabled when disabled prop is set", () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled();
  });

  it("merges custom className", () => {
    render(<Input className="custom-class" placeholder="Custom" />);
    expect(screen.getByPlaceholderText("Custom")).toHaveClass("custom-class");
  });
});
