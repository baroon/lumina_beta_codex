import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { WorkspaceHeroDto } from "@/types/api";
import { HeroRowCompact } from "./HeroRowCompact";

function hero(overrides: Partial<WorkspaceHeroDto> = {}): WorkspaceHeroDto {
  return {
    queries: 0,
    mentions: 0,
    citations: 0,
    brandMentionRate: null,
    brandAbsenceRate: null,
    brandFirstMentionRate: null,
    ...overrides,
  };
}

describe("HeroRowCompact", () => {
  it("renders four labeled tiles in order", () => {
    render(<HeroRowCompact hero={hero({ queries: 12 })} previousHero={null} />);
    expect(screen.getByText("Queries")).toBeInTheDocument();
    expect(screen.getByText("Mentions")).toBeInTheDocument();
    expect(screen.getByText("Citations")).toBeInTheDocument();
    expect(screen.getByText("Brand mention rate")).toBeInTheDocument();
  });

  it("renders the value with thousands separators", () => {
    render(<HeroRowCompact hero={hero({ queries: 1234, mentions: 56789 })} previousHero={null} />);
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("56,789")).toBeInTheDocument();
  });

  it("renders the brand mention rate as a rounded percent", () => {
    render(<HeroRowCompact hero={hero({ brandMentionRate: 0.426 })} previousHero={null} />);
    expect(screen.getByText("43%")).toBeInTheDocument();
  });

  it("falls back to em-dash when brand mention rate is null", () => {
    render(<HeroRowCompact hero={hero({ brandMentionRate: null })} previousHero={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders an up delta with success color when the current value beats the previous", () => {
    render(<HeroRowCompact hero={hero({ queries: 100 })} previousHero={hero({ queries: 80 })} />);
    // 25% up — labeled "Up 25 percent" by aria-label.
    expect(screen.getByLabelText(/Up 25 percent/i)).toBeInTheDocument();
  });

  it("renders a 'New' badge when the previous value was zero but current is non-zero", () => {
    render(<HeroRowCompact hero={hero({ mentions: 5 })} previousHero={hero({ mentions: 0 })} />);
    expect(screen.getByText(/New/i)).toBeInTheDocument();
  });

  it("renders no delta when both current and previous are zero", () => {
    const { container } = render(<HeroRowCompact hero={hero()} previousHero={hero()} />);
    // No success or error chip should show up.
    expect(container.querySelector(".text-semantic-success-600")).toBeNull();
    expect(container.querySelector(".text-semantic-error-600")).toBeNull();
  });

  it("renders no delta when previousHero is null", () => {
    const { container } = render(
      <HeroRowCompact hero={hero({ queries: 10 })} previousHero={null} />,
    );
    expect(container.querySelector(".text-semantic-success-600")).toBeNull();
    expect(container.querySelector(".text-semantic-error-600")).toBeNull();
  });
});
