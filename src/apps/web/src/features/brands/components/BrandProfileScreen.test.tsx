import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
let updateAliasesMutate: ReturnType<typeof vi.fn>;
let updateAliasesState = { isPending: false, isError: false, isSuccess: false };
let updateProfileMutate: ReturnType<typeof vi.fn>;
let updateProfileState = { isPending: false, isError: false, isSuccess: false };
let addTopicMutate: ReturnType<typeof vi.fn>;
let addTopicState = { isPending: false, isError: false, isSuccess: false };
let removeTopicMutate: ReturnType<typeof vi.fn>;
let removeTopicState = { isPending: false, isError: false, isSuccess: false };

vi.mock("@/features/brands/hooks/useBrands", () => ({
  useBrand: () => ({ ...brandState, refetch: vi.fn() }),
  useBrandDiscoveryResults: () => discoveryState,
  useUpdateBrandAliases: () => ({ mutate: updateAliasesMutate, ...updateAliasesState }),
  useUpdateBrandProfile: () => ({ mutate: updateProfileMutate, ...updateProfileState }),
  useAddBrandTopic: () => ({ mutate: addTopicMutate, ...addTopicState }),
  useRemoveBrandTopic: () => ({ mutate: removeTopicMutate, ...removeTopicState }),
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
    updateAliasesMutate = vi.fn();
    updateAliasesState = { isPending: false, isError: false, isSuccess: false };
    updateProfileMutate = vi.fn();
    updateProfileState = { isPending: false, isError: false, isSuccess: false };
    addTopicMutate = vi.fn();
    addTopicState = { isPending: false, isError: false, isSuccess: false };
    removeTopicMutate = vi.fn();
    removeTopicState = { isPending: false, isError: false, isSuccess: false };
  });

  it("renders the brand name in the page header", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
  });

  it("renders a 'Re-run discovery' link", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByText(/re-run discovery/i)).toBeInTheDocument();
  });

  it("renders the brand profile identity fields as editable inputs", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByDisplayValue("Career platform for resume building.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Career Services")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SaaS")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Empowering job seekers.")).toBeInTheDocument();
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

  it("renders 'Not set.' as the placeholder when a profile field is null", () => {
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
    // Four "Not set." placeholders — one per empty input/textarea.
    expect(screen.getAllByPlaceholderText(/^not set\.?$/i).length).toBe(4);
  });

  // -------------------------------------------------------------------
  // Aliases section — inline editing
  // -------------------------------------------------------------------

  it("Save aliases is disabled when the alias draft matches the server", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByRole("button", { name: /Save aliases/i })).toBeDisabled();
  });

  it("X removes an alias chip and the change is staged as dirty", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /Remove alias Acme Inc/i }));
    expect(screen.queryByText("Acme Inc")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save aliases/i })).toBeEnabled();
  });

  it("Add appends a new alias and clears the input", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add an alias/i), "AcmeCorp");
    await userEvent.click(screen.getByRole("button", { name: /^Add alias$/ }));
    expect(screen.getByText("AcmeCorp")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/add an alias/i)).toHaveValue("");
  });

  it("Add rejects a case-insensitive duplicate with an inline error", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add an alias/i), "acme");
    await userEvent.click(screen.getByRole("button", { name: /^Add alias$/ }));
    expect(screen.getByText(/already in the list/i)).toBeInTheDocument();
  });

  it("Add rejects an alias that matches the brand name", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add an alias/i), "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /^Add alias$/ }));
    expect(screen.getByText(/matches the brand name/i)).toBeInTheDocument();
  });

  it("Save aliases calls the mutation with the staged draft", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /Remove alias Acme Inc/i }));
    await userEvent.type(screen.getByPlaceholderText(/add an alias/i), "AcmeWorld");
    await userEvent.click(screen.getByRole("button", { name: /^Add alias$/ }));
    await userEvent.click(screen.getByRole("button", { name: /Save aliases/i }));
    expect(updateAliasesMutate).toHaveBeenCalledOnce();
    const [args] = updateAliasesMutate.mock.calls[0];
    expect(args.aliases).toEqual(["Acme", "AcmeWorld"]);
  });

  it("Discard reverts the staged changes back to the server data", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /Remove alias Acme Inc/i }));
    expect(screen.queryByText("Acme Inc")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Discard/i }));
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
  });

  it("Save aliases button shows 'Saving…' while the mutation is pending", () => {
    updateAliasesState = { isPending: true, isError: false, isSuccess: false };
    render(<BrandProfileScreen brandId="b1" />);
    // Only the aliases mutation is pending; the identity button still
    // reads "Save identity", so "Saving…" is unambiguous.
    expect(screen.getByRole("button", { name: /Saving…/i })).toBeDisabled();
  });

  // -------------------------------------------------------------------
  // Identity section — inline editing
  // -------------------------------------------------------------------

  it("Save identity is disabled when no identity field is dirty", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByRole("button", { name: /Save identity/i })).toBeDisabled();
  });

  it("Typing into the industry input dirties the section", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    const industry = screen.getByLabelText(/^industry$/i) as HTMLInputElement;
    await userEvent.clear(industry);
    await userEvent.type(industry, "Tech");
    expect(industry.value).toBe("Tech");
    expect(screen.getByRole("button", { name: /Save identity/i })).toBeEnabled();
  });

  it("Save identity calls the mutation with trimmed + null-coerced fields", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    const positioning = screen.getByLabelText(/^positioning$/i) as HTMLInputElement;
    await userEvent.clear(positioning);
    await userEvent.type(positioning, "  New positioning.  ");
    const description = screen.getByLabelText(/^description$/i) as HTMLTextAreaElement;
    await userEvent.clear(description);
    await userEvent.click(screen.getByRole("button", { name: /Save identity/i }));
    expect(updateProfileMutate).toHaveBeenCalledOnce();
    const [args] = updateProfileMutate.mock.calls[0];
    expect(args.positioning).toBe("New positioning.");
    // Cleared description sends null so the server clears the field too,
    // round-tripping the same emptiness the FE renders as "Not set".
    expect(args.shortDescription).toBeNull();
    // Untouched fields keep their server values.
    expect(args.industry).toBe("Career Services");
    expect(args.category).toBe("SaaS");
  });

  it("Discard reverts identity edits back to the server values", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    const industry = screen.getByLabelText(/^industry$/i) as HTMLInputElement;
    await userEvent.clear(industry);
    await userEvent.type(industry, "Tech");
    expect(industry.value).toBe("Tech");
    // Two Discard buttons can be present (identity + aliases) when both
    // are dirty; here only identity is dirty so there's exactly one.
    await userEvent.click(screen.getByRole("button", { name: /Discard/i }));
    expect((screen.getByLabelText(/^industry$/i) as HTMLInputElement).value).toBe(
      "Career Services",
    );
  });

  it("Save identity button shows 'Saving…' while the mutation is pending", () => {
    updateProfileState = { isPending: true, isError: false, isSuccess: false };
    render(<BrandProfileScreen brandId="b1" />);
    // Only the identity mutation is pending; the aliases button still
    // reads "Save aliases", so "Saving…" is unambiguous.
    expect(screen.getByRole("button", { name: /Saving…/i })).toBeDisabled();
  });

  // -------------------------------------------------------------------
  // Topics section — add / remove
  // -------------------------------------------------------------------

  it("renders one chip per topic with an X to remove it", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(
      screen.getByRole("button", { name: /Remove topic Resume optimization/i }),
    ).toBeInTheDocument();
  });

  it("clicking the X on a topic fires the remove mutation with the topic ID", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Remove topic Resume optimization/i }),
    );
    expect(removeTopicMutate).toHaveBeenCalledOnce();
    const [args] = removeTopicMutate.mock.calls[0];
    expect(args).toBe("t1");
  });

  it("Add fires the add mutation with the trimmed name", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add a topic/i), "  Career change  ");
    await userEvent.click(screen.getByRole("button", { name: /^Add topic$/ }));
    expect(addTopicMutate).toHaveBeenCalledOnce();
    const [args] = addTopicMutate.mock.calls[0];
    expect(args).toEqual({ name: "Career change" });
  });

  it("Add is disabled when the input is empty or whitespace-only", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByRole("button", { name: /^Add topic$/ })).toBeDisabled();
  });

  it("Add shows an inline error for a case-insensitive duplicate of an existing topic", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add a topic/i), "resume OPTIMIZATION");
    await userEvent.click(screen.getByRole("button", { name: /^Add topic$/ }));
    expect(screen.getByText(/already in the list/i)).toBeInTheDocument();
    expect(addTopicMutate).not.toHaveBeenCalled();
  });

  it("Add button shows 'Adding…' while the mutation is pending", () => {
    addTopicState = { isPending: true, isError: false, isSuccess: false };
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByRole("button", { name: /Adding…/i })).toBeDisabled();
  });

  it("shows a server-error hint when the add mutation errors", () => {
    addTopicState = { isPending: false, isError: true, isSuccess: false };
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByText(/Add failed/i)).toBeInTheDocument();
  });
});
