import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll } from "vitest";
import type { SourceListItemDto, SourceTypeReferenceDto } from "@/types/api";
import { SourcesTable } from "./SourcesTable";

// Radix Select polyfill — see select.test.tsx for context.
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const sourceTypes: SourceTypeReferenceDto[] = [
  { id: "1", code: "Editorial", name: "Editorial", description: "News.", displayOrder: 5 },
  {
    id: "2",
    code: "Institutional",
    name: "Institutional",
    description: "Govt + NGO.",
    displayOrder: 8,
  },
];

function makeSource(overrides: Partial<SourceListItemDto> = {}): SourceListItemDto {
  return {
    sourceId: "s1",
    sourceName: "ASLA",
    domain: "asla.org",
    normalizedDomain: "asla.org",
    sourceType: "Institutional",
    status: "Active",
    provenanceSource: "LLMClassified",
    confidenceScore: 0.9,
    citationCount: 3,
    platforms: [{ platformId: "p1", code: "openai", name: "ChatGPT" }],
    ...overrides,
  };
}

describe("SourcesTable", () => {
  it("renders one row per source with name + domain + citation count", () => {
    render(
      <SourcesTable
        sources={[
          makeSource(),
          makeSource({
            sourceId: "s2",
            sourceName: "Wired",
            normalizedDomain: "wired.com",
            citationCount: 7,
          }),
        ]}
        sourceTypes={sourceTypes}
        onClassify={vi.fn()}
        onSelectSource={vi.fn()}
      />,
    );
    expect(screen.getByText("ASLA")).toBeInTheDocument();
    expect(screen.getByText("Wired")).toBeInTheDocument();
    expect(screen.getByText("asla.org")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders empty state when sources is empty", () => {
    render(
      <SourcesTable
        sources={[]}
        sourceTypes={sourceTypes}
        onClassify={vi.fn()}
        onSelectSource={vi.fn()}
      />,
    );
    expect(screen.getByText(/no sources were cited/i)).toBeInTheDocument();
  });

  it("calls onSelectSource when the source name button is clicked", async () => {
    const onSelectSource = vi.fn();
    render(
      <SourcesTable
        sources={[makeSource()]}
        sourceTypes={sourceTypes}
        onClassify={vi.fn()}
        onSelectSource={onSelectSource}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "ASLA" }));
    expect(onSelectSource).toHaveBeenCalledWith("s1");
  });

  it("calls onClassify with the new type when the dropdown changes", async () => {
    const onClassify = vi.fn();
    render(
      <SourcesTable
        sources={[makeSource()]}
        sourceTypes={sourceTypes}
        onClassify={onClassify}
        onSelectSource={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: /source type for asla/i }));
    await userEvent.click(screen.getByRole("option", { name: /editorial/i }));
    expect(onClassify).toHaveBeenCalledWith("s1", "Editorial");
  });

  it("renders provenance label based on provenanceSource", () => {
    const { rerender } = render(
      <SourcesTable
        sources={[makeSource({ provenanceSource: "LLMClassified" })]}
        sourceTypes={sourceTypes}
        onClassify={vi.fn()}
        onSelectSource={vi.fn()}
      />,
    );
    expect(screen.getByText("LLM")).toBeInTheDocument();

    rerender(
      <SourcesTable
        sources={[makeSource({ provenanceSource: "UserCorrected" })]}
        sourceTypes={sourceTypes}
        onClassify={vi.fn()}
        onSelectSource={vi.fn()}
      />,
    );
    expect(screen.getByText("You")).toBeInTheDocument();

    rerender(
      <SourcesTable
        sources={[makeSource({ provenanceSource: "RuleBased" })]}
        sourceTypes={sourceTypes}
        onClassify={vi.fn()}
        onSelectSource={vi.fn()}
      />,
    );
    expect(screen.getByText("Rule-based")).toBeInTheDocument();
  });
});
