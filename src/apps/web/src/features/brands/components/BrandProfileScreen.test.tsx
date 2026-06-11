import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
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
let addCompetitorMutate: ReturnType<typeof vi.fn>;
let addCompetitorState = { isPending: false, isError: false, isSuccess: false };
let removeCompetitorMutate: ReturnType<typeof vi.fn>;
let removeCompetitorState = { isPending: false, isError: false, isSuccess: false };

let deleteBrandMutate: ReturnType<typeof vi.fn>;
let deleteBrandState = { isPending: false, isError: false, isSuccess: false };
let addAudienceMutate: ReturnType<typeof vi.fn>;
let removeAudienceMutate: ReturnType<typeof vi.fn>;
let addMarketMutate: ReturnType<typeof vi.fn>;
let removeMarketMutate: ReturnType<typeof vi.fn>;
let addProductMutate: ReturnType<typeof vi.fn>;
let removeProductMutate: ReturnType<typeof vi.fn>;
let addTrustSignalMutate: ReturnType<typeof vi.fn>;
let removeTrustSignalMutate: ReturnType<typeof vi.fn>;
let renameBrandMutate: ReturnType<typeof vi.fn>;
let renameBrandState: { isPending: boolean; isError: boolean; error?: Error } = {
  isPending: false,
  isError: false,
};
let updateWebsiteUrlMutate: ReturnType<typeof vi.fn>;
let updateWebsiteUrlState: { isPending: boolean; isError: boolean; error?: Error } = {
  isPending: false,
  isError: false,
};
let renameTopicMutate: ReturnType<typeof vi.fn>;
let renameCompetitorMutate: ReturnType<typeof vi.fn>;
let renameAudienceMutate: ReturnType<typeof vi.fn>;
let renameMarketMutate: ReturnType<typeof vi.fn>;
let renameProductMutate: ReturnType<typeof vi.fn>;
let renameTrustSignalMutate: ReturnType<typeof vi.fn>;
let updateCompetitorAliasesMutate: ReturnType<typeof vi.fn>;
let updateCompetitorAliasesState: {
  isPending: boolean;
  isError: boolean;
  error?: Error;
} = { isPending: false, isError: false };

const idleMutation = { isPending: false, isError: false, isSuccess: false };

vi.mock("@/features/brands/hooks/useBrands", () => ({
  useBrand: () => ({ ...brandState, refetch: vi.fn() }),
  useBrandDiscoveryResults: () => discoveryState,
  useUpdateBrandAliases: () => ({ mutate: updateAliasesMutate, ...updateAliasesState }),
  useUpdateBrandProfile: () => ({ mutate: updateProfileMutate, ...updateProfileState }),
  useAddBrandTopic: () => ({ mutate: addTopicMutate, ...addTopicState }),
  useRemoveBrandTopic: () => ({ mutate: removeTopicMutate, ...removeTopicState }),
  useAddBrandCompetitor: () => ({ mutate: addCompetitorMutate, ...addCompetitorState }),
  useRemoveBrandCompetitor: () => ({ mutate: removeCompetitorMutate, ...removeCompetitorState }),
  useDeleteBrand: () => ({ mutate: deleteBrandMutate, ...deleteBrandState }),
  useAddBrandAudience: () => ({ mutate: addAudienceMutate, ...idleMutation }),
  useRemoveBrandAudience: () => ({ mutate: removeAudienceMutate, ...idleMutation }),
  useAddBrandMarket: () => ({ mutate: addMarketMutate, ...idleMutation }),
  useRemoveBrandMarket: () => ({ mutate: removeMarketMutate, ...idleMutation }),
  useAddBrandProduct: () => ({ mutate: addProductMutate, ...idleMutation }),
  useRemoveBrandProduct: () => ({ mutate: removeProductMutate, ...idleMutation }),
  useAddBrandTrustSignal: () => ({ mutate: addTrustSignalMutate, ...idleMutation }),
  useRemoveBrandTrustSignal: () => ({ mutate: removeTrustSignalMutate, ...idleMutation }),
  useRenameBrand: () => ({ mutate: renameBrandMutate, ...renameBrandState }),
  useUpdateBrandWebsiteUrl: () => ({ mutate: updateWebsiteUrlMutate, ...updateWebsiteUrlState }),
  useRenameBrandTopic: () => ({ mutate: renameTopicMutate, ...idleMutation }),
  useRenameBrandCompetitor: () => ({ mutate: renameCompetitorMutate, ...idleMutation }),
  useRenameBrandAudience: () => ({ mutate: renameAudienceMutate, ...idleMutation }),
  useRenameBrandMarket: () => ({ mutate: renameMarketMutate, ...idleMutation }),
  useRenameBrandProduct: () => ({ mutate: renameProductMutate, ...idleMutation }),
  useRenameBrandTrustSignal: () => ({ mutate: renameTrustSignalMutate, ...idleMutation }),
  useUpdateBrandCompetitorAliases: () => ({
    mutate: updateCompetitorAliasesMutate,
    ...updateCompetitorAliasesState,
  }),
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
    addCompetitorMutate = vi.fn();
    addCompetitorState = { isPending: false, isError: false, isSuccess: false };
    removeCompetitorMutate = vi.fn();
    removeCompetitorState = { isPending: false, isError: false, isSuccess: false };
    deleteBrandMutate = vi.fn();
    deleteBrandState = { isPending: false, isError: false, isSuccess: false };
    addAudienceMutate = vi.fn();
    removeAudienceMutate = vi.fn();
    addMarketMutate = vi.fn();
    removeMarketMutate = vi.fn();
    addProductMutate = vi.fn();
    removeProductMutate = vi.fn();
    addTrustSignalMutate = vi.fn();
    removeTrustSignalMutate = vi.fn();
    renameBrandMutate = vi.fn();
    renameBrandState = { isPending: false, isError: false };
    updateWebsiteUrlMutate = vi.fn();
    updateWebsiteUrlState = { isPending: false, isError: false };
    renameTopicMutate = vi.fn();
    renameCompetitorMutate = vi.fn();
    renameAudienceMutate = vi.fn();
    renameMarketMutate = vi.fn();
    renameProductMutate = vi.fn();
    renameTrustSignalMutate = vi.fn();
    updateCompetitorAliasesMutate = vi.fn();
    updateCompetitorAliasesState = { isPending: false, isError: false };
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

  // -------------------------------------------------------------------
  // Competitors section — add / remove
  // -------------------------------------------------------------------

  it("renders one chip per competitor with an X to remove it", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(
      screen.getByRole("button", { name: /Remove competitor Resume\.io/i }),
    ).toBeInTheDocument();
  });

  it("clicking the X on a competitor fires the remove mutation with the ID", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /Remove competitor Resume\.io/i }));
    expect(removeCompetitorMutate).toHaveBeenCalledOnce();
    const [args] = removeCompetitorMutate.mock.calls[0];
    expect(args).toBe("c1");
  });

  it("Add competitor fires the add mutation with the trimmed name", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add a competitor/i), "  Adobe Express  ");
    await userEvent.click(screen.getByRole("button", { name: /^Add competitor$/ }));
    expect(addCompetitorMutate).toHaveBeenCalledOnce();
    const [args] = addCompetitorMutate.mock.calls[0];
    expect(args).toEqual({ name: "Adobe Express" });
  });

  it("Add competitor is disabled when the input is empty", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByRole("button", { name: /^Add competitor$/ })).toBeDisabled();
  });

  it("Add competitor shows an inline error for a case-insensitive duplicate", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add a competitor/i), "resume.IO");
    await userEvent.click(screen.getByRole("button", { name: /^Add competitor$/ }));
    expect(screen.getByText(/already in the list/i)).toBeInTheDocument();
    expect(addCompetitorMutate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Danger zone — brand delete with type-to-confirm dialog
  // -------------------------------------------------------------------

  it("renders a Delete brand button in the danger zone", () => {
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByRole("button", { name: /^Delete brand$/ })).toBeInTheDocument();
  });

  it("clicking Delete brand opens the confirmation dialog", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /^Delete brand$/ }));
    expect(screen.getByRole("heading", { name: /Delete brand/i })).toBeInTheDocument();
  });

  it("typing the brand name and clicking confirm fires the delete mutation", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /^Delete brand$/ }));
    await userEvent.type(screen.getByLabelText(/Confirmation phrase/i), "Acme Corp");
    // Two "Delete brand" buttons exist now (danger-zone trigger + the
    // dialog's destructive button). The destructive one inside the
    // dialog is the second match.
    const deleteButtons = screen.getAllByRole("button", { name: /^Delete brand$/ });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(deleteBrandMutate).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------
  // Audience / Market / Product / Trust signal sections — smoke tests
  // -------------------------------------------------------------------
  //
  // All four sections route through the same DimensionEditCard +
  // EditableChipList molecule that the topic + competitor sections
  // use, and that molecule has its own dedicated test file. These
  // smoke tests just confirm the wiring: the right hook fires with
  // the right name when the right Add button is clicked.

  it("Add audience fires the audience mutation with the trimmed name", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add an audience/i), "  HR teams  ");
    await userEvent.click(screen.getByRole("button", { name: /^Add audience$/ }));
    expect(addAudienceMutate).toHaveBeenCalledOnce();
    expect(addAudienceMutate.mock.calls[0][0]).toEqual({ name: "HR teams" });
  });

  it("Add market fires the market mutation with the trimmed name", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add a market/i), "Germany");
    await userEvent.click(screen.getByRole("button", { name: /^Add market$/ }));
    expect(addMarketMutate).toHaveBeenCalledOnce();
    expect(addMarketMutate.mock.calls[0][0]).toEqual({ name: "Germany" });
  });

  it("Add product fires the product mutation with the trimmed name", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add a product/i), "Pro Plan");
    await userEvent.click(screen.getByRole("button", { name: /^Add product$/ }));
    expect(addProductMutate).toHaveBeenCalledOnce();
    expect(addProductMutate.mock.calls[0][0]).toEqual({ name: "Pro Plan" });
  });

  it("Add trust signal fires the trust-signal mutation with the trimmed name", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.type(screen.getByPlaceholderText(/add a trust signal/i), "Webby 2025");
    await userEvent.click(screen.getByRole("button", { name: /^Add trust signal$/ }));
    expect(addTrustSignalMutate).toHaveBeenCalledOnce();
    expect(addTrustSignalMutate.mock.calls[0][0]).toEqual({ name: "Webby 2025" });
  });

  it("clicking X on a product chip fires the remove mutation with the id", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Remove product AI Resume Builder/i }),
    );
    expect(removeProductMutate).toHaveBeenCalledWith("pr1");
  });

  // -------------------------------------------------------------------
  // Brand rename + website URL edit
  // -------------------------------------------------------------------

  it("clicking the page-header name + typing + blurring fires the rename mutation", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /Acme Corp/i }));
    const input = screen.getByDisplayValue("Acme Corp") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "Acme Renamed");
    input.blur();
    expect(renameBrandMutate).toHaveBeenCalledOnce();
    expect(renameBrandMutate.mock.calls[0][0]).toEqual({ name: "Acme Renamed" });
  });

  it("shows a rename error message when the brand-rename mutation fails", () => {
    renameBrandState = {
      isPending: false,
      isError: true,
      error: new Error('A brand named "Acme Renamed" already exists in this workspace.'),
    };
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByText(/A brand named "Acme Renamed" already exists/i)).toBeInTheDocument();
  });

  it("editing the website URL + blurring fires the updateWebsiteUrl mutation", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /https:\/\/acme\.example\.com/i }));
    const input = screen.getByDisplayValue("https://acme.example.com") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://acme-new.com");
    input.blur();
    expect(updateWebsiteUrlMutate).toHaveBeenCalledOnce();
    expect(updateWebsiteUrlMutate.mock.calls[0][0]).toEqual({
      websiteUrl: "https://acme-new.com",
    });
  });

  it("the open-in-new-tab link points at the current website URL", () => {
    render(<BrandProfileScreen brandId="b1" />);
    const link = screen.getByRole("link", {
      name: /Open https:\/\/acme\.example\.com in a new tab/i,
    });
    expect(link).toHaveAttribute("href", "https://acme.example.com");
  });

  it("shows a website-URL error message when the mutation fails", () => {
    updateWebsiteUrlState = {
      isPending: false,
      isError: true,
      error: new Error("Website URL must be an absolute http(s) URL. Got: not a url"),
    };
    render(<BrandProfileScreen brandId="b1" />);
    expect(screen.getByText(/Website URL must be an absolute http\(s\) URL/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------
  // Dimension chip rename — click-to-edit on each chip text
  // -------------------------------------------------------------------

  it("clicking a topic chip opens an inline rename input + Enter commits", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Rename topic Resume optimization/i }),
    );
    const input = screen.getByDisplayValue("Resume optimization") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "Resume tips{enter}");
    expect(renameTopicMutate).toHaveBeenCalledOnce();
    expect(renameTopicMutate.mock.calls[0][0]).toEqual({ id: "t1", name: "Resume tips" });
  });

  it("clicking a competitor chip opens rename + blur commits", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /Rename competitor Resume\.io/i }));
    const input = screen.getByDisplayValue("Resume.io") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "Resume Builder Pro");
    input.blur();
    expect(renameCompetitorMutate).toHaveBeenCalledOnce();
    expect(renameCompetitorMutate.mock.calls[0][0]).toEqual({
      id: "c1",
      name: "Resume Builder Pro",
    });
  });

  it("rename is a no-op when the trimmed value matches the original", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(screen.getByRole("button", { name: /Rename audience Job seekers/i }));
    const input = screen.getByDisplayValue("Job seekers") as HTMLInputElement;
    // Same text + blur — no mutation fires.
    input.blur();
    expect(renameAudienceMutate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Competitor aliases dialog
  // -------------------------------------------------------------------

  it("clicking the details ⋯ on a competitor opens the aliases dialog", async () => {
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Edit details for competitor Resume\.io/i }),
    );
    // The dialog title is the competitor name.
    expect(within(screen.getByRole("dialog")).getByText(/Resume\.io/i)).toBeInTheDocument();
  });

  it("Save aliases fires the mutation with the staged aliases list", async () => {
    discoveryState = {
      data: {
        ...discoveryFixture,
        competitors: [
          {
            ...discoveryFixture.competitors[0],
            id: "c1",
            name: "Resume.io",
            aliases: ["resumeio"],
          },
        ],
      },
      isLoading: false,
    };
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Edit details for competitor Resume\.io/i }),
    );
    const dialog = screen.getByRole("dialog");
    // Type a new alias and press Enter (AliasEditor commits on Enter).
    await userEvent.click(within(dialog).getByRole("button", { name: /add aliases/i }));
    await userEvent.type(
      within(dialog).getByPlaceholderText(/Type and press Enter/i),
      "ResumeIO Pro{enter}",
    );
    // Save commits the full staged list to the mutation.
    await userEvent.click(within(dialog).getByRole("button", { name: /^Save aliases$/ }));
    expect(updateCompetitorAliasesMutate).toHaveBeenCalledOnce();
    const [args] = updateCompetitorAliasesMutate.mock.calls[0];
    expect(args.competitorId).toBe("c1");
    expect(args.aliases).toEqual(["resumeio", "ResumeIO Pro"]);
  });

  it("Save is disabled until the staged aliases differ from the server", async () => {
    discoveryState = {
      data: {
        ...discoveryFixture,
        competitors: [
          {
            ...discoveryFixture.competitors[0],
            id: "c1",
            name: "Resume.io",
            aliases: ["resumeio"],
          },
        ],
      },
      isLoading: false,
    };
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Edit details for competitor Resume\.io/i }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /^Save aliases$/ })).toBeDisabled();
  });

  it("renders a server-error message when the alias save fails", async () => {
    updateCompetitorAliasesState = {
      isPending: false,
      isError: true,
      error: new Error("Alias 'Resume.io' collides with the competitor's primary name."),
    };
    render(<BrandProfileScreen brandId="b1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Edit details for competitor Resume\.io/i }),
    );
    expect(
      within(screen.getByRole("dialog")).getByText(/collides with the competitor's primary name/i),
    ).toBeInTheDocument();
  });
});
