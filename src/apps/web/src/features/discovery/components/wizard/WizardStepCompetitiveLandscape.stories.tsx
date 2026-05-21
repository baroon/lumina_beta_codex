import type { Meta, StoryObj } from "@storybook/react";
import { WizardStepCompetitiveLandscape } from "./WizardStepCompetitiveLandscape";
import type { CandidateDto } from "@/types/api";

const mockTopics: CandidateDto[] = [
  {
    id: "t1",
    name: "best enterprise cloud platforms for DevOps teams",
    description: null,
    confidence: 0.7,
    source: "LLMSuggested",
    metadata: {},
  },
];

const mockCompetitors: CandidateDto[] = [
  {
    id: "c1",
    name: "Competitor Corp",
    description: "Direct competitor in cloud infra. [Region: high, Scale: medium, Segment: high]",
    confidence: 0.6,
    source: "LLMSuggested",
    metadata: {},
  },
  {
    id: "c2",
    name: "Rival Inc",
    description: "Competing analytics platform.",
    confidence: 0.8,
    source: "LLMSuggested",
    metadata: {},
  },
];

const mockTrustSignals: CandidateDto[] = [
  {
    id: "ts1",
    name: "SOC 2 Certified",
    description: null,
    confidence: 0.95,
    source: "WebsiteCrawl",
    metadata: {},
  },
];

const noop = () => {};

const sectionDefaults = {
  onToggle: noop,
  onSelectAll: noop,
  onDeselectAll: noop,
  onAddCustom: noop,
};

const meta: Meta<typeof WizardStepCompetitiveLandscape> = {
  title: "Features/Discovery/Wizard/WizardStepCompetitiveLandscape",
  component: WizardStepCompetitiveLandscape,
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
type Story = StoryObj<typeof WizardStepCompetitiveLandscape>;

export const Default: Story = {
  args: {
    topics: { candidates: mockTopics, selectedIds: new Set(["t1"]), ...sectionDefaults },
    competitors: { candidates: mockCompetitors, selectedIds: new Set(["c2"]), ...sectionDefaults },
    trustSignals: {
      candidates: mockTrustSignals,
      selectedIds: new Set(["ts1"]),
      ...sectionDefaults,
    },
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    topics: { candidates: mockTopics, selectedIds: new Set(["t1"]), ...sectionDefaults },
    competitors: { candidates: mockCompetitors, selectedIds: new Set(["c2"]), ...sectionDefaults },
    trustSignals: {
      candidates: mockTrustSignals,
      selectedIds: new Set(["ts1"]),
      ...sectionDefaults,
    },
  },
};

export const WithRefresh: Story = {
  args: {
    topics: {
      candidates: mockTopics,
      selectedIds: new Set(["t1"]),
      ...sectionDefaults,
      onRefresh: noop,
      refreshesRemaining: 2,
      isRefreshing: false,
    },
    competitors: {
      candidates: mockCompetitors,
      selectedIds: new Set(["c2"]),
      ...sectionDefaults,
      onRefresh: noop,
      refreshesRemaining: 3,
      isRefreshing: false,
    },
    trustSignals: {
      candidates: mockTrustSignals,
      selectedIds: new Set(["ts1"]),
      ...sectionDefaults,
      onRefresh: noop,
      refreshesRemaining: 0,
      isRefreshing: false,
    },
  },
};
