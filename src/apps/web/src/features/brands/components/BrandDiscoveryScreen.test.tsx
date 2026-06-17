import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrandDto } from "@/types/api";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    className?: string;
  }) => {
    let href = to;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, value);
      }
    }
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

let brandsState: {
  data?: BrandDto[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: ReturnType<typeof vi.fn>;
};

vi.mock("@/features/brands/hooks/useBrands", () => ({
  useBrandsList: () => brandsState,
}));

import { BrandDiscoveryScreen } from "./BrandDiscoveryScreen";

beforeEach(() => {
  brandsState = {
    data: [
      brand(),
      brand({
        id: "b2",
        name: "Bold",
        websiteUrl: "https://bold.example",
        latestDiscovery: {
          id: "d2",
          status: "AwaitingConfirmation",
          startedAt: "2026-06-08T00:00:00Z",
          completedAt: null,
          pagesCrawled: 5,
        },
      }),
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
});

describe("BrandDiscoveryScreen", () => {
  it("renders summary tiles and brand discovery rows", () => {
    render(<BrandDiscoveryScreen />);

    expect(screen.getByRole("heading", { name: "Brand Discovery" })).toBeInTheDocument();
    expect(screen.getByText("Brands")).toBeInTheDocument();
    expect(screen.getByText("Completed discoveries")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Bold")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("AwaitingConfirmation")).toBeInTheDocument();
  });

  it("links completed brands to profile and pending brands to discovery", () => {
    render(<BrandDiscoveryScreen />);

    expect(screen.getByRole("link", { name: "Acme" })).toHaveAttribute(
      "href",
      "/brands/b1/profile",
    );
    expect(screen.getByRole("link", { name: /Open profile/i })).toHaveAttribute(
      "href",
      "/brands/b1/profile",
    );
    expect(screen.getByRole("link", { name: /Continue discovery/i })).toHaveAttribute(
      "href",
      "/brands/b2/discovery",
    );
  });

  it("renders an empty state when no brands exist", () => {
    brandsState = { data: [], isLoading: false, isError: false, refetch: vi.fn() };

    render(<BrandDiscoveryScreen />);

    expect(screen.getByText(/No brands yet/i)).toBeInTheDocument();
  });

  it("renders the shared error state when brands fail to load", () => {
    brandsState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Brands unavailable"),
      refetch: vi.fn(),
    };

    render(<BrandDiscoveryScreen />);

    expect(screen.getByText("Brands unavailable")).toBeInTheDocument();
  });
});

function brand(overrides: Partial<BrandDto> = {}): BrandDto {
  return {
    id: "b1",
    name: "Acme",
    websiteUrl: "https://acme.example",
    createdAt: "2026-06-01T00:00:00Z",
    latestDiscovery: {
      id: "d1",
      status: "Completed",
      startedAt: "2026-06-01T00:00:00Z",
      completedAt: "2026-06-01T00:10:00Z",
      pagesCrawled: 12,
    },
    ...overrides,
  };
}
