import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrandDto } from "@/types/api";
import { deriveBrandDiscoveryAttentionItems } from "@/features/brands/brands";

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
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("Acme")).toBeInTheDocument();
    expect(within(table).getByText("Bold")).toBeInTheDocument();
    expect(within(table).getByText("Completed")).toBeInTheDocument();
    expect(within(table).getByText("AwaitingConfirmation")).toBeInTheDocument();
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
    const table = screen.getByRole("table");
    expect(within(table).getByRole("link", { name: /Continue discovery/i })).toHaveAttribute(
      "href",
      "/brands/b2/discovery",
    );
  });

  it("renders discovery attention cards with action links", () => {
    render(<BrandDiscoveryScreen />);

    const attention = screen.getByRole("region", { name: "Discovery attention" });
    expect(screen.getByText("Discovery attention")).toBeInTheDocument();
    expect(within(attention).getByText("Bold")).toBeInTheDocument();
    expect(within(attention).getByText("Continue discovery")).toHaveAttribute(
      "href",
      "/brands/b2/discovery",
    );
    expect(within(attention).queryByText("Acme")).not.toBeInTheDocument();
  });

  it("derives prioritized brand discovery attention items", () => {
    const items = deriveBrandDiscoveryAttentionItems([
      brand(),
      brand({
        id: "not-started",
        name: "No Discovery",
        latestDiscovery: null,
      }),
      brand({
        id: "failed",
        name: "Failed Brand",
        latestDiscovery: {
          id: "d3",
          status: "Failed",
          startedAt: "2026-06-08T00:00:00Z",
          completedAt: null,
          pagesCrawled: 2,
        },
      }),
      brand({
        id: "running",
        name: "Running Brand",
        latestDiscovery: {
          id: "d4",
          status: "Crawling",
          startedAt: "2026-06-08T00:00:00Z",
          completedAt: null,
          pagesCrawled: 1,
        },
      }),
    ]);

    expect(items.map((item) => item.brandId)).toEqual(["failed", "not-started", "running"]);
    expect(items[0]).toMatchObject({
      priority: "High",
      action: "Retry discovery",
    });
    expect(items[1]).toMatchObject({
      priority: "High",
      action: "Start discovery",
    });
    expect(items[2]).toMatchObject({
      priority: "Medium",
      action: "Monitor discovery",
    });
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
