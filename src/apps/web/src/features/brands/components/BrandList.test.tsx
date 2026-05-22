import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrandList } from "./BrandList";
import type { BrandDto } from "@/types/api";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a href="#" className={className}>
      {children}
    </a>
  ),
}));

let listState: { data?: BrandDto[]; isLoading: boolean };

vi.mock("../hooks/useBrands", () => ({
  useBrandsList: () => listState,
}));

describe("BrandList", () => {
  beforeEach(() => {
    navigate.mockReset();
    listState = { data: [], isLoading: false };
  });

  it("shows an empty state when there are no brands", () => {
    render(<BrandList />);
    expect(screen.getByText(/no brands yet/i)).toBeInTheDocument();
  });

  it("lists brands with their discovery status", () => {
    listState = {
      isLoading: false,
      data: [
        {
          id: "b1",
          name: "Acme",
          websiteUrl: "https://acme.com",
          createdAt: "2026-01-01T00:00:00Z",
          latestDiscovery: {
            id: "r1",
            status: "Completed",
            pagesCrawled: 5,
            startedAt: "2026-01-01T00:00:00Z",
            completedAt: null,
          },
        },
      ] as unknown as BrandDto[],
    };

    render(<BrandList />);

    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("https://acme.com")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("navigates to add-brand when the button is clicked", async () => {
    render(<BrandList />);
    await userEvent.click(screen.getByRole("button", { name: /add brand/i }));
    expect(navigate).toHaveBeenCalledWith({ to: "/brands/new" });
  });
});
