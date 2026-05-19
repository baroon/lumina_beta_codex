import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<PageHeader title="Dashboard" description="Overview of your brands" />);
    expect(screen.getByText("Overview of your brands")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("renders children in actions area", () => {
    render(
      <PageHeader title="Dashboard">
        <button>Add New</button>
      </PageHeader>,
    );
    expect(screen.getByRole("button", { name: "Add New" })).toBeInTheDocument();
  });
});
