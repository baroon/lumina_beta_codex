import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/test-utils";
import { Sidebar } from "./Sidebar";
import { APP_COPY } from "@/content/app";

describe("Sidebar", () => {
  it("renders app name from APP_COPY", async () => {
    renderWithRouter(<Sidebar />);
    expect(await screen.findByText(APP_COPY.name)).toBeInTheDocument();
  });

  it("renders 'Add Brand' nav link", async () => {
    renderWithRouter(<Sidebar />);
    expect(await screen.findByText(APP_COPY.nav.addBrand)).toBeInTheDocument();
  });

  it("renders 'Trackers' nav link pointing at /trackers", async () => {
    renderWithRouter(<Sidebar />);
    const link = await screen.findByRole("link", { name: new RegExp(APP_COPY.nav.trackers, "i") });
    expect(link).toHaveAttribute("href", "/trackers");
  });

  it("renders 'Brands' nav link pointing at the index route", async () => {
    renderWithRouter(<Sidebar />);
    const link = await screen.findByRole("link", {
      name: new RegExp(`^${APP_COPY.nav.brands}$`, "i"),
    });
    expect(link).toHaveAttribute("href", "/");
  });
});
