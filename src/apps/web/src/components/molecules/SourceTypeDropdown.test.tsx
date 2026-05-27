import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll } from "vitest";
import type { SourceTypeReferenceDto } from "@/types/api";
import { SourceTypeDropdown } from "./SourceTypeDropdown";

// Radix UI Select uses DOM APIs that jsdom doesn't implement (same polyfill
// as select.test.tsx).
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const sourceTypes: SourceTypeReferenceDto[] = [
  { id: "1", code: "Editorial", name: "Editorial", description: "News articles.", displayOrder: 5 },
  {
    id: "2",
    code: "ReviewSite",
    name: "Review Site",
    description: "G2, Trustpilot.",
    displayOrder: 6,
  },
];

describe("SourceTypeDropdown", () => {
  it("renders the current value", () => {
    render(<SourceTypeDropdown value="Editorial" onChange={vi.fn()} sourceTypes={sourceTypes} />);
    expect(screen.getByRole("combobox", { name: /source type/i })).toHaveTextContent("Editorial");
  });

  it("calls onChange when the user picks a different type", async () => {
    const onChange = vi.fn();
    render(<SourceTypeDropdown value="Editorial" onChange={onChange} sourceTypes={sourceTypes} />);

    await userEvent.click(screen.getByRole("combobox", { name: /source type/i }));
    await userEvent.click(screen.getByRole("option", { name: /review site/i }));

    expect(onChange).toHaveBeenCalledWith("ReviewSite");
  });

  it("falls back to displaying an out-of-taxonomy value rather than crashing", () => {
    // Defense-in-depth: enum drift between FE and BE shouldn't crash the row.
    render(<SourceTypeDropdown value="MysteryType" onChange={vi.fn()} sourceTypes={sourceTypes} />);
    expect(screen.getByRole("combobox", { name: /source type/i })).toHaveTextContent("MysteryType");
  });

  it("does not call onChange when disabled", async () => {
    const onChange = vi.fn();
    render(
      <SourceTypeDropdown
        value="Editorial"
        onChange={onChange}
        sourceTypes={sourceTypes}
        disabled
      />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: /source type/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
