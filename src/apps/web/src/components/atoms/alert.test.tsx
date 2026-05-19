import { render, screen } from "@testing-library/react";
import { Alert, AlertTitle, AlertDescription } from "./alert";

describe("Alert", () => {
  it("renders with role='alert'", () => {
    render(<Alert>Alert content</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders default variant", () => {
    render(<Alert>Default alert</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Default alert");
  });

  it("renders destructive variant", () => {
    render(<Alert variant="destructive">Error alert</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Error alert");
  });

  it("merges custom className", () => {
    render(<Alert className="custom-class">Alert</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("custom-class");
  });
});

describe("AlertTitle", () => {
  it("renders as an h5 heading", () => {
    render(<AlertTitle>Title</AlertTitle>);
    expect(screen.getByRole("heading", { level: 5 })).toHaveTextContent("Title");
  });
});

describe("AlertDescription", () => {
  it("renders content", () => {
    render(<AlertDescription>Description text</AlertDescription>);
    expect(screen.getByText("Description text")).toBeInTheDocument();
  });
});
