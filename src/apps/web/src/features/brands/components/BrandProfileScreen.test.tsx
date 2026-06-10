import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BrandDto, DiscoveryResultsDto } from "@/types/api";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a href="#" className={className}>
      {children}
    </a>
  ),
}));

let brandState: { data?: BrandDto; isLoading: boolean; isError: boolean; error?: unknown };
let discoveryState: { data?: DiscoveryResultsDto; isLoading: boolean };

vi.mock("@/features/brands/hooks/useBrands", () => ({
  useBrand: () => ({ ...brandState, refetch: vi.fn() }),
  useBrandDiscoveryResults: () => discoveryState,
}));

import { BrandProfileScreen } from "./BrandProfileScreen";

const brandFixture: BrandDto = {
  id: "b1",
  name: "Acme Corp",
  websiteUrl: "https://acme.example.com",
  createdAt: "2026-06-01T00:00:00Z",
  latestDiscovery: null,
};

const discoveryFixture: DiscoveryResultsDto = {
  brandId: "b1",
  brandName: "Acme Corp",
  status: "Completed",
  brandProfile: {
    id: "p1",
    shortDescription: "Career platform for resume building.",
    industry: "Career Services",
    category: "SaaS",
    positioning: "Empowering job seekers.",
    confidence: 0.9,
    source: "LLMSuggested",
  },
  products: [
    {
      id: "pr1",
      name: "AI Resume Builder",
      description: null,
      confidence: 0.9,
      source: "LLMSuggested",
      metadata: {},
    },
  ],
  audiences: [
    {
      id: "a1",
      name: "Job seekers",
      description: null,
      confidence: 0.9,
      source: "LLMSuggested",
      metadata: {},
    },
  ],
  markets: [
    {
      id: "m1",
      name: "US",
      description: null,
      confidence: 0.9,
      source: "LLMSuggested",
      metadata: {},
    },
  ],
  topics: [
    {
      id: "t1",
      name: "Resume optimization",
      description: null,
      confidence: 0.9,
      source: "LLMSuggested",
      metadata: {},
    },
  ],
  competitors: [
    {
      id: "c1",
      name: "Resume.io",
      description: null,
      confidence: 0.9,
      source: "LLMSuggested",
      metadata: {},
    },
  ],
  trustSignals: [
    {
      id: "ts1",
      name: "Trustpilot reviews",
      description: null,
      confidence: 0.9,
      source: "LLMSuggested",
      metadata: {},
    },
  ],
  aliases: ["Acme", "Acme Inc"],
};

describe("BrandProfileScreen", () => {
  beforeEach(() => {
    brandState = { data: brandFixture, isLoading: false, isError: false };
    discoveryState = { data: discoveryFixture, isLoading: false };
  });

  it("renders the brand name in the page header", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
  });

  it("renders a 'Re-run discovery' link", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByText(/re-run discovery/i)).toBeInTheDocument();
  });

  it("renders the brand profile identity fields", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByText("Career platform for resume building.")).toBeInTheDocument();
    expect(screen.getByText("Career Services")).toBeInTheDocument();
    expect(screen.getByText("SaaS")).toBeInTheDocument();
    expect(screen.getByText("Empowering job seekers.")).toBeInTheDocument();
    expect(screen.getByText("https://acme.example.com")).toBeInTheDocument();
  });

  it("renders aliases as chips", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
  });

  it("renders one dimension section per dimension type with their items", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByText("AI Resume Builder")).toBeInTheDocument();
    expect(screen.getByText("Job seekers")).toBeInTheDocument();
    expect(screen.getByText("US")).toBeInTheDocument();
    expect(screen.getByText("Resume optimization")).toBeInTheDocument();
    expect(screen.getByText("Resume.io")).toBeInTheDocument();
    expect(screen.getByText("Trustpilot reviews")).toBeInTheDocument();
  });

  it("renders an empty hint when a dimension list is empty", () => {
    discoveryState = {
      data: { ...discoveryFixture, products: [] },
      isLoading: false,
    };
    render(<BrandProfileScreen brandId="b1" />);
    // The "Not detected." copy renders inside the empty Products section.
    expect(screen.getAllByText(/not detected/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the empty-discovery state when discovery hasn't run", () => {
    discoveryState = { data: undefined, isLoading: false };
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByText(/discovery hasn't run yet/i)).toBeInTheDocument();
  });

  it("falls back to 'Not set.' for missing profile fields", () => {
    discoveryState = {
      data: {
        ...discoveryFixture,
        brandProfile: {
          ...discoveryFixture.brandProfile!,
          industry: null,
          category: null,
          positioning: null,
          shortDescription: null,
        },
      },
      isLoading: false,
    };
    render(<BrandProfileScreen brandId="b1" />);
    // Four "Not set." labels — one per missing field.
    expect(screen.getAllByText(/^not set\.?$/i).length).toBe(4);
  });
});
