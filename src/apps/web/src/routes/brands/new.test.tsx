import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/features/brands/components/AddBrandForm", () => ({
  AddBrandForm: () => <div data-testid="add-brand-form" />,
}));

import { NewBrandPage } from "./new";

describe("NewBrandPage", () => {
  it("renders the add-brand form", () => {
    render(<NewBrandPage />);
    expect(screen.getByTestId("add-brand-form")).toBeInTheDocument();
  });
});
