import type { Meta, StoryObj } from "@storybook/react";
import type { SourceListItemDto, SourceTypeReferenceDto } from "@/types/api";
import { SourcesTable } from "./SourcesTable";

const sourceTypes: SourceTypeReferenceDto[] = [
  {
    id: "1",
    code: "Owned",
    name: "Owned",
    description: "The brand's own properties.",
    displayOrder: 1,
  },
  { id: "2", code: "Editorial", name: "Editorial", description: "News articles.", displayOrder: 5 },
  {
    id: "3",
    code: "Institutional",
    name: "Institutional",
    description: "Government, NGO, academic.",
    displayOrder: 8,
  },
  {
    id: "4",
    code: "ReviewSite",
    name: "Review Site",
    description: "G2, Trustpilot.",
    displayOrder: 6,
  },
  { id: "5", code: "Unknown", name: "Unknown", description: "Not classified.", displayOrder: 12 },
];

const sources: SourceListItemDto[] = [
  {
    sourceId: "s1",
    sourceName: "American Society of Landscape Architects (ASLA)",
    domain: "asla.org",
    normalizedDomain: "asla.org",
    sourceType: "Institutional",
    status: "Active",
    provenanceSource: "LLMClassified",
    confidenceScore: 0.9,
    citationCount: 5,
    platforms: [
      { platformId: "p1", code: "openai", name: "ChatGPT" },
      { platformId: "p2", code: "claude", name: "Claude" },
    ],
  },
  {
    sourceId: "s2",
    sourceName: "Trustpilot",
    domain: "trustpilot.com",
    normalizedDomain: "trustpilot.com",
    sourceType: "ReviewSite",
    status: "UserCorrected",
    provenanceSource: "UserCorrected",
    confidenceScore: 1.0,
    citationCount: 3,
    platforms: [{ platformId: "p1", code: "openai", name: "ChatGPT" }],
  },
  {
    sourceId: "s3",
    sourceName: "Some Forum Post",
    domain: null,
    normalizedDomain: null,
    sourceType: "Unknown",
    status: "Unknown",
    provenanceSource: "RuleBased",
    confidenceScore: 0.3,
    citationCount: 1,
    platforms: [{ platformId: "p3", code: "gemini", name: "Gemini" }],
  },
];

const meta: Meta<typeof SourcesTable> = {
  title: "Features/Reports/SourcesTable",
  component: SourcesTable,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof SourcesTable>;

export const Default: Story = {
  args: {
    sources,
    sourceTypes,
    onClassify: () => {},
    onSelectSource: () => {},
  },
};

export const Empty: Story = {
  args: {
    sources: [],
    sourceTypes,
    onClassify: () => {},
    onSelectSource: () => {},
  },
};
