import type { Meta, StoryObj } from "@storybook/react";
import { SuggestionCard } from "./SuggestionCard";
import type { CandidateDto } from "@/types/api";

const baseCand: CandidateDto = {
  id: "1",
  name: "Enterprise SaaS Platform",
  description: "Cloud-based software solution for large organizations.",
  confidence: 0.85,
  source: "WebsiteCrawl",
  status: "Suggested",
  metadata: {},
};

const meta: Meta<typeof SuggestionCard> = {
  title: "Features/Discovery/SuggestionCard",
  component: SuggestionCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    onToggle: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SuggestionCard>;

export const Unselected: Story = {
  args: { candidate: baseCand, selected: false },
};

export const Selected: Story = {
  args: { candidate: baseCand, selected: true },
};

export const WithAIBadge: Story = {
  args: {
    candidate: { ...baseCand, source: "LLMSuggested" },
    selected: false,
  },
};
