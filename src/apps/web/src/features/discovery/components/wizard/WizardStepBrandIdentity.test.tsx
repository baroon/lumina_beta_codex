import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardStepBrandIdentity } from "./WizardStepBrandIdentity";
import type { BrandProfileDto } from "@/types/api";

function profile(overrides?: Partial<BrandProfileDto>): BrandProfileDto {
  return {
    id: "bp1",
    shortDescription: "A SaaS tool",
    industry: "Tech",
    category: "Software",
    positioning: "Leader",
    confidence: 0.9,
    source: "LLMSuggested",
    ...overrides,
  } as BrandProfileDto;
}

describe("WizardStepBrandIdentity", () => {
  it("renders an empty state when there is no profile", () => {
    render(<WizardStepBrandIdentity brandProfile={null} />);
    expect(screen.getByText("No brand profile detected.")).toBeInTheDocument();
  });

  it("renders the brand profile fields", () => {
    render(<WizardStepBrandIdentity brandProfile={profile()} onProfileChange={vi.fn()} />);
    expect(screen.getByText("Brand Profile")).toBeInTheDocument();
    expect(screen.getByText("A SaaS tool")).toBeInTheDocument();
    expect(screen.getByText("Tech")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Leader")).toBeInTheDocument();
  });

  it("commits an industry edit via Enter", async () => {
    const onProfileChange = vi.fn();
    render(<WizardStepBrandIdentity brandProfile={profile()} onProfileChange={onProfileChange} />);

    await userEvent.click(screen.getByText("Tech"));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Fintech");
    await userEvent.keyboard("{Enter}");

    expect(onProfileChange).toHaveBeenCalledWith("industry", "Fintech");
  });

  it("commits a description edit via blur", async () => {
    const onProfileChange = vi.fn();
    render(<WizardStepBrandIdentity brandProfile={profile()} onProfileChange={onProfileChange} />);

    await userEvent.click(screen.getByText("A SaaS tool"));
    const textarea = screen.getByRole("textbox");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "A new description");
    await userEvent.tab();

    expect(onProfileChange).toHaveBeenCalledWith("shortDescription", "A new description");
  });

  it("clears a field via its clear button", async () => {
    const onProfileChange = vi.fn();
    render(<WizardStepBrandIdentity brandProfile={profile()} onProfileChange={onProfileChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Clear Industry" }));

    expect(onProfileChange).toHaveBeenCalledWith("industry", "");
  });

  it("adds and removes brand aliases", async () => {
    const onAliasesChange = vi.fn();
    const { rerender } = render(
      <WizardStepBrandIdentity
        brandProfile={profile()}
        onProfileChange={vi.fn()}
        aliases={[]}
        onAliasesChange={onAliasesChange}
      />,
    );

    await userEvent.type(screen.getByPlaceholderText("Add an alias..."), "Lumina AI{Enter}");
    expect(onAliasesChange).toHaveBeenCalledWith(["Lumina AI"]);

    rerender(
      <WizardStepBrandIdentity
        brandProfile={profile()}
        onProfileChange={vi.fn()}
        aliases={["Lumina AI"]}
        onAliasesChange={onAliasesChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove Lumina AI" }));
    expect(onAliasesChange).toHaveBeenLastCalledWith([]);
  });
});
