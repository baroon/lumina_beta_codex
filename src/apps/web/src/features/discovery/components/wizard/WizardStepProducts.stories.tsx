import type { Meta, StoryObj } from "@storybook/react";
import { WizardStepProducts } from "./WizardStepProducts";
import type { CandidateDto } from "@/types/api";

const mockProducts: CandidateDto[] = [
  {
    id: "p1",
    name: "Cloud Platform",
    description: "Core SaaS product for enterprise teams.",
    confidence: 0.95,
    source: "WebsiteCrawl",
    status: "Suggested",
    metadata: {},
  },
  {
    id: "p2",
    name: "Analytics Dashboard",
    description: "Real-time analytics and reporting.",
    confidence: 0.7,
    source: "LLMSuggested",
    status: "Suggested",
    metadata: {},
  },
  {
    id: "p3",
    name: "API Gateway",
    description: null,
    confidence: 0.4,
    source: "LLMSuggested",
    status: "Suggested",
    metadata: {},
  },
];

const meta: Meta<typeof WizardStepProducts> = {
  title: "Features/Discovery/Wizard/WizardStepProducts",
  component: WizardStepProducts,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
  args: {
    onToggle: () => {},
    onSelectAll: () => {},
    onDeselectAll: () => {},
    onAddCustom: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof WizardStepProducts>;

export const WithCandidates: Story = {
  args: {
    candidates: mockProducts,
    selectedIds: new Set(["p1", "p2"]),
  },
};

export const Empty: Story = {
  args: {
    candidates: [],
    selectedIds: new Set(),
  },
};

export const WithRefresh: Story = {
  args: {
    candidates: mockProducts,
    selectedIds: new Set(["p1", "p2"]),
    onRefresh: () => {},
    refreshesRemaining: 2,
    isRefreshing: false,
  },
};
