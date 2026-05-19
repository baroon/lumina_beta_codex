import { render, screen } from "@testing-library/react";
import { Label } from "./label";

describe("Label", () => {
  it("renders as a label element", () => {
    render(<Label>Name</Label>);
    expect(screen.getByText("Name").tagName).toBe("LABEL");
  });

  it("renders sm size variant", () => {
    render(<Label labelSize="sm">Small label</Label>);
    expect(screen.getByText("Small label")).toHaveClass("text-xs");
  });

  it("renders default size variant", () => {
    render(<Label labelSize="default">Default label</Label>);
    expect(screen.getByText("Default label")).toHaveClass("text-sm");
  });

  it("renders lg size variant", () => {
    render(<Label labelSize="lg">Large label</Label>);
    expect(screen.getByText("Large label")).toHaveClass("text-base");
  });

  it("forwards htmlFor attribute", () => {
    render(<Label htmlFor="email-input">Email</Label>);
    expect(screen.getByText("Email")).toHaveAttribute("for", "email-input");
  });
});
