import type { Meta, StoryObj } from "@storybook/react";
import { WizardStepAudiencesMarkets } from "./WizardStepAudiencesMarkets";
import type { CandidateDto } from "@/types/api";

const mockAudiences: CandidateDto[] = [
  {
    id: "a1",
    name: "Enterprise CTOs",
    description: "C-level tech leaders at large organizations.",
    confidence: 0.8,
    source: "LLMSuggested",
    status: "Suggested",
    metadata: {},
  },
  {
    id: "a2",
    name: "DevOps Engineers",
    description: "Infrastructure and operations teams.",
    confidence: 0.7,
    source: "WebsiteCrawl",
    status: "Suggested",
    metadata: {},
  },
];

const mockMarkets: CandidateDto[] = [
  {
    id: "m1",
    name: "North America",
    description: null,
    confidence: 0.9,
    source: "WebsiteCrawl",
    status: "Suggested",
    metadata: {},
  },
  {
    id: "m2",
    name: "Western Europe",
    description: null,
    confidence: 0.6,
    source: "LLMSuggested",
    status: "Suggested",
    metadata: {},
  },
];

const noop = () => {};

const meta: Meta<typeof WizardStepAudiencesMarkets> = {
  title: "Features/Discovery/Wizard/WizardStepAudiencesMarkets",
  component: WizardStepAudiencesMarkets,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WizardStepAudiencesMarkets>;

export const Default: Story = {
  args: {
    audiences: {
      candidates: mockAudiences,
      selectedIds: new Set(["a1"]),
      onToggle: noop,
      onSelectAll: noop,
      onDeselectAll: noop,
      onAddCustom: noop,
    },
    markets: {
      candidates: mockMarkets,
      selectedIds: new Set(["m1"]),
      onToggle: noop,
      onSelectAll: noop,
      onDeselectAll: noop,
      onAddCustom: noop,
    },
  },
};

export const Empty: Story = {
  args: {
    audiences: {
      candidates: [],
      selectedIds: new Set(),
      onToggle: noop,
      onSelectAll: noop,
      onDeselectAll: noop,
      onAddCustom: noop,
    },
    markets: {
      candidates: [],
      selectedIds: new Set(),
      onToggle: noop,
      onSelectAll: noop,
      onDeselectAll: noop,
      onAddCustom: noop,
    },
  },
};
