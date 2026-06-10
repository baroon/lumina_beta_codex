import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithRouter } from "@/test-utils";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("renders nothing when items is empty", () => {
    renderWithRouter(<Breadcrumb items={[]} />);
    // The router root renders an Outlet wrapper; assert the Breadcrumb's
    // nav element is not in the tree rather than the entire container.
    expect(screen.queryByRole("navigation", { name: /breadcrumb/i })).not.toBeInTheDocument();
  });

  it("renders the labels in order", async () => {
    renderWithRouter(
      <Breadcrumb
        items={[
          { label: "Workspace", to: "/overview" },
          { label: "Acme", to: "/brands/$brandId/profile", params: { brandId: "b-1" } },
          { label: "Scan" },
        ]}
      />,
    );
    expect(await screen.findByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Scan")).toBeInTheDocument();
  });

  it("renders the last item as plain text with aria-current=page", async () => {
    renderWithRouter(
      <Breadcrumb items={[{ label: "Workspace", to: "/overview" }, { label: "Current Page" }]} />,
    );
    const current = await screen.findByText("Current Page");
    expect(current).toHaveAttribute("aria-current", "page");
    // The last item never renders as a link, even if `to` were provided.
    expect(screen.queryByRole("link", { name: "Current Page" })).not.toBeInTheDocument();
  });

  it("renders non-last items with `to` as links", async () => {
    renderWithRouter(
      <Breadcrumb items={[{ label: "Workspace", to: "/overview" }, { label: "End" }]} />,
    );
    const link = await screen.findByRole("link", { name: "Workspace" });
    expect(link).toHaveAttribute("href", "/overview");
  });

  it("renders a skeleton for items with undefined label", async () => {
    const { container } = renderWithRouter(
      <Breadcrumb
        items={[
          { label: "Workspace", to: "/overview" },
          { to: "/brands/$brandId/profile", params: { brandId: "b-1" } },
          {},
        ]}
      />,
    );
    // Wait for router to mount the nav.
    await screen.findByRole("navigation", { name: /breadcrumb/i });
    // Two undefined-label items → two skeleton segments.
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(2);
  });

  it("renders n-1 separators for n items (no separator before first)", async () => {
    const { container } = renderWithRouter(
      <Breadcrumb
        items={[{ label: "A", to: "/overview" }, { label: "B", to: "/overview" }, { label: "C" }]}
      />,
    );
    await screen.findByRole("navigation", { name: /breadcrumb/i });
    // ChevronRight icons rendered with aria-hidden — query by the SVG tag inside the nav.
    const nav = container.querySelector("nav[aria-label='Breadcrumb']");
    expect(nav).not.toBeNull();
    const separators = nav?.querySelectorAll("svg") ?? [];
    expect(separators.length).toBe(2);
  });
});
