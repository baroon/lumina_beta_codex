import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardStepReview } from "./WizardStepReview";
import type { BrandProfileDto, CandidateDto } from "@/types/api";

function cand(
  id: string,
  name: string,
  source: CandidateDto["source"] = "LLMSuggested",
): CandidateDto {
  return {
    id,
    name,
    description: null,
    confidence: 0.9,
    source,
    metadata: {},
  };
}

function emptySection() {
  return { candidates: [] as CandidateDto[], selectedIds: new Set<string>() };
}

function makeSections(productCandidates: CandidateDto[], selected: string[]) {
  return {
    products: { candidates: productCandidates, selectedIds: new Set(selected) },
    audiences: emptySection(),
    markets: emptySection(),
    topics: emptySection(),
    competitors: emptySection(),
    trustSignals: emptySection(),
  };
}

const brandProfile = {
  id: "bp1",
  shortDescription: "A SaaS tool",
  industry: "Tech",
  category: "Software",
  positioning: "Leader",
  confidence: 0.9,
  source: "LLMSuggested",
} as BrandProfileDto;

function renderReview(
  overrides: {
    onToggle?: ReturnType<typeof vi.fn>;
    onEditSection?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const props = {
    brandProfile,
    sections: makeSections([cand("p1", "Alpha")], ["p1"]),
    onToggle: overrides.onToggle ?? vi.fn(),
    onEditSection: overrides.onEditSection ?? vi.fn(),
  };
  render(<WizardStepReview {...props} />);
  return props;
}

describe("WizardStepReview", () => {
  it("renders section labels, selected chips, counts, and empty states", () => {
    renderReview();
    expect(screen.getByText("Products & Services")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("1 / 1 selected")).toBeInTheDocument();
    expect(screen.getAllByText("None selected").length).toBe(5);
  });

  it("calls onEditSection for the brand profile and a section", async () => {
    const onEditSection = vi.fn();
    renderReview({ onEditSection });

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await userEvent.click(editButtons[0]);
    expect(onEditSection).toHaveBeenCalledWith("brandProfile");

    await userEvent.click(editButtons[1]);
    expect(onEditSection).toHaveBeenCalledWith("products");
  });

  it("removes a chip with undo", async () => {
    const onToggle = vi.fn();
    renderReview({ onToggle });

    await userEvent.click(screen.getByRole("button", { name: "Remove Alpha" }));
    expect(onToggle).toHaveBeenCalledWith("products", "p1");
    expect(screen.getByText(/Removed "Alpha"/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenLastCalledWith("products", "p1");
  });

  it("offers only delete and edit-section — no add or inline rename", () => {
    renderReview();
    expect(screen.queryByRole("button", { name: /add custom/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Alpha" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Alpha" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
  });

  it("shows the type tag on product and trust-signal chips", () => {
    render(
      <WizardStepReview
        brandProfile={null}
        sections={{
          products: {
            candidates: [{ ...cand("p1", "Alpha"), metadata: { productType: "Service" } }],
            selectedIds: new Set(["p1"]),
          },
          audiences: emptySection(),
          markets: emptySection(),
          topics: emptySection(),
          competitors: emptySection(),
          trustSignals: {
            candidates: [
              {
                ...cand("ts1", "SOC 2"),
                metadata: { signalType: "CertificationsAndAccreditations" },
              },
            ],
            selectedIds: new Set(["ts1"]),
          },
        }}
        onToggle={vi.fn()}
        onEditSection={vi.fn()}
      />,
    );
    expect(screen.getByText("Service")).toBeInTheDocument();
    expect(screen.getByText("Certifications & Accreditations")).toBeInTheDocument();
  });

  it("renders a country flag for market chips with a countryCode", () => {
    render(
      <WizardStepReview
        brandProfile={null}
        sections={{
          products: emptySection(),
          audiences: emptySection(),
          markets: {
            candidates: [{ ...cand("m1", "United States"), metadata: { countryCode: "US" } }],
            selectedIds: new Set(["m1"]),
          },
          topics: emptySection(),
          competitors: emptySection(),
          trustSignals: emptySection(),
        }}
        onToggle={vi.fn()}
        onEditSection={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "US" })).toHaveAttribute(
      "src",
      "https://flagcdn.com/us.svg",
    );
  });

  it("removes an alias via its remove button", async () => {
    const onRemoveAlias = vi.fn();
    render(
      <WizardStepReview
        brandProfile={brandProfile}
        sections={makeSections([], [])}
        onToggle={vi.fn()}
        onEditSection={vi.fn()}
        aliases={["Lumina AI"]}
        onRemoveAlias={onRemoveAlias}
      />,
    );

    expect(screen.getByText("Lumina AI")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove Lumina AI" }));
    expect(onRemoveAlias).toHaveBeenCalledWith("Lumina AI");
  });
});
