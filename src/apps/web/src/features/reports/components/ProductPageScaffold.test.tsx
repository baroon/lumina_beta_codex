import { render, screen } from "@testing-library/react";
import { PRODUCT_PAGES } from "@/content/productPages";
import { ProductPageScaffold } from "./ProductPageScaffold";

describe("ProductPageScaffold", () => {
  it("renders the page identity, primary question, metrics, sections, and empty state", () => {
    render(<ProductPageScaffold page={PRODUCT_PAGES.recommendations} />);

    expect(screen.getByRole("heading", { name: "Recommendations" })).toBeInTheDocument();
    expect(screen.getByText("Primary question")).toBeInTheDocument();
    expect(screen.getByText(/what should we fix/i)).toBeInTheDocument();
    expect(screen.getByText("Action workbench")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No recommendations yet. Recommendations appear after enough answer, citation, competitor, and topic evidence is collected.",
      ),
    ).toBeInTheDocument();
  });
});
