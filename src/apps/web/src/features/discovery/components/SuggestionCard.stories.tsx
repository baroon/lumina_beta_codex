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

export const AISource: Story = {
  args: {
    candidate: { ...baseCand, source: "LLMSuggested" },
    selected: false,
  },
};

export const ManualSource: Story = {
  args: {
    candidate: {
      ...baseCand,
      id: "2",
      name: "Custom Analytics Tool",
      description: "Manually added by the user.",
      confidence: 1,
      source: "UserAdded",
      status: "Suggested",
    },
    selected: true,
  },
};

export const WithTypeBadge: Story = {
  args: {
    candidate: {
      ...baseCand,
      name: "SOC 2 Certified",
      description: "SOC 2 Type II compliance certification.",
      metadata: { signalType: "CertificationsAndAccreditations" },
    },
    selected: false,
    typeMetadataKey: "signalType",
    typeLabels: {
      CertificationsAndAccreditations: "Certifications & Accreditations",
      TestimonialsAndReviews: "Testimonials & Reviews",
    },
  },
};
