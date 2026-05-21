import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { createBrandMock } = vi.hoisted(() => ({
  createBrandMock: {
    mutate: vi.fn(),
    isError: false,
    error: null as unknown,
    isPending: false,
  },
}));

vi.mock("../hooks/useBrands", () => ({
  useCreateBrand: () => createBrandMock,
}));

import { AddBrandForm } from "./AddBrandForm";

describe("AddBrandForm", () => {
  beforeEach(() => {
    createBrandMock.mutate.mockReset();
    createBrandMock.isError = false;
    createBrandMock.error = null;
    createBrandMock.isPending = false;
  });

  it("renders the form fields and submit button", () => {
    render(<AddBrandForm />);
    expect(screen.getByText("Add Brand")).toBeInTheDocument();
    expect(screen.getByLabelText("Brand Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Website URL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start discovery/i })).toBeInTheDocument();
  });

  it("submits valid values to createBrand.mutate", async () => {
    render(<AddBrandForm />);
    await userEvent.type(screen.getByLabelText("Brand Name"), "Acme");
    await userEvent.type(screen.getByLabelText("Website URL"), "https://acme.com");
    await userEvent.click(screen.getByRole("button", { name: /start discovery/i }));

    await waitFor(() =>
      expect(createBrandMock.mutate).toHaveBeenCalledWith({
        name: "Acme",
        websiteUrl: "https://acme.com",
      }),
    );
  });

  it("shows validation errors and does not submit when empty", async () => {
    render(<AddBrandForm />);
    await userEvent.click(screen.getByRole("button", { name: /start discovery/i }));

    expect(await screen.findByText("Brand name is required")).toBeInTheDocument();
    expect(screen.getByText("Website URL is required")).toBeInTheDocument();
    expect(createBrandMock.mutate).not.toHaveBeenCalled();
  });

  it("surfaces a submission error", () => {
    createBrandMock.isError = true;
    createBrandMock.error = new Error("Boom");
    render(<AddBrandForm />);
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });

  it("shows a pending state on the submit button", () => {
    createBrandMock.isPending = true;
    render(<AddBrandForm />);
    expect(screen.getByRole("button", { name: /analyzing/i })).toBeDisabled();
  });
});
