import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PromptGenerationProgress } from "./PromptGenerationProgress";

describe("PromptGenerationProgress", () => {
  it("renders the title with the brand name when provided", () => {
    render(<PromptGenerationProgress brandName="Nostri" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      /Crafting prompts for Nostri/i,
    );
  });

  it("falls back to a generic title when no brand name is provided", () => {
    render(<PromptGenerationProgress brandName="" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/Crafting your prompts/i);
  });

  it("renders the onboarding stepper at step 4 of 5", () => {
    render(<PromptGenerationProgress brandName="Acme" />);
    expect(screen.getByRole("list", { name: /step 4 of 5/i })).toBeInTheDocument();
  });

  it("renders the first rotating awareness message", () => {
    render(<PromptGenerationProgress brandName="Acme" />);
    expect(screen.getByText(/Prompts are the questions real buyers ask AI/i)).toBeInTheDocument();
  });
});
