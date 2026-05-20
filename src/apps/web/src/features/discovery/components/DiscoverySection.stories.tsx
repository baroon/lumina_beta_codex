import type { Meta, StoryObj } from "@storybook/react";
import { DiscoverySection } from "./DiscoverySection";
import type { CandidateDto } from "@/types/api";

const mockCandidates: CandidateDto[] = [
  {
    id: "1",
    name: "Enterprise SaaS",
    description: "Cloud platform for enterprises.",
    confidence: 0.9,
    source: "WebsiteCrawl",
    status: "Suggested",
    metadata: {},
  },
  {
    id: "2",
    name: "SMB Analytics",
    description: "Analytics tool for small businesses.",
    confidence: 0.6,
    source: "LLMSuggested",
    status: "Suggested",
    metadata: {},
  },
  {
    id: "3",
    name: "API Gateway",
    description: null,
    confidence: 0.3,
    source: "WebsiteCrawl",
    status: "Suggested",
    metadata: {},
  },
];

const meta: Meta<typeof DiscoverySection> = {
  title: "Features/Discovery/DiscoverySection",
  component: DiscoverySection,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
  args: {
    title: "Products & Services",
    description: "These products and services were found on your website.",
    emptyMessage: "No products detected.",
    onToggle: () => {},
    onSelectAll: () => {},
    onDeselectAll: () => {},
    onAddCustom: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof DiscoverySection>;

export const WithCandidates: Story = {
  args: {
    candidates: mockCandidates,
    selectedIds: new Set(["1"]),
  },
};

export const Empty: Story = {
  args: {
    candidates: [],
    selectedIds: new Set(),
  },
};

export const AllSelected: Story = {
  args: {
    candidates: mockCandidates,
    selectedIds: new Set(["1", "2", "3"]),
  },
};

export const WithRefresh: Story = {
  args: {
    candidates: mockCandidates,
    selectedIds: new Set(["1"]),
    onRefresh: () => {},
    refreshesRemaining: 2,
    isRefreshing: false,
  },
};

export const RefreshExhausted: Story = {
  args: {
    candidates: mockCandidates,
    selectedIds: new Set(["1"]),
    onRefresh: () => {},
    refreshesRemaining: 0,
    isRefreshing: false,
  },
};

export const Refreshing: Story = {
  args: {
    candidates: mockCandidates,
    selectedIds: new Set(["1"]),
    onRefresh: () => {},
    refreshesRemaining: 1,
    isRefreshing: true,
  },
};
