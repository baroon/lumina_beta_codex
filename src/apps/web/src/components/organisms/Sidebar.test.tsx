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
});
