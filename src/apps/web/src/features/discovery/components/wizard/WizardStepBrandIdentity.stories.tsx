import type { Meta, StoryObj } from "@storybook/react";
import { WizardStepBrandIdentity } from "./WizardStepBrandIdentity";

const meta: Meta<typeof WizardStepBrandIdentity> = {
  title: "Features/Discovery/Wizard/WizardStepBrandIdentity",
  component: WizardStepBrandIdentity,
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
type Story = StoryObj<typeof WizardStepBrandIdentity>;

export const Default: Story = {
  args: {
    brandProfile: {
      id: "bp-1",
      shortDescription: "Leading cloud platform for enterprise teams.",
      industry: "SaaS",
      category: "B2B Software",
      positioning: "Enterprise-grade reliability with developer-friendly tools.",
      confidence: 0.9,
      source: "WebsiteCrawl",
      status: "Suggested",
    },
  },
};

export const LowConfidence: Story = {
  args: {
    brandProfile: {
      id: "bp-2",
      shortDescription: "Some kind of tech company.",
      industry: "Technology",
      category: null,
      positioning: null,
      confidence: 0.3,
      source: "LLMSuggested",
      status: "Suggested",
    },
  },
};

export const NoProfile: Story = {
  args: {
    brandProfile: null,
  },
};
