import type { Meta, StoryObj } from "@storybook/react";
import { PromptCheckGroup } from "./PromptCheckGroup";

const meta: Meta<typeof PromptCheckGroup> = {
  title: "Features/Trackers/PromptCheckGroup",
  component: PromptCheckGroup,
  tags: ["autodocs"],
  args: {
    title: "Discovery",
    topics: [{ id: "t1", name: "Pricing" }],
    canAdd: true,
    onRegenerate: () => {},
    onRemove: () => {},
    onEdit: () => {},
    onAdd: () => {},
    prompts: [
      {
        id: "p1",
        text: "What are the best CRM options in the US?",
        status: "Draft",
        source: "Generated",
        visibilityCheckId: "c1",
        visibilityCheckName: "Discovery",
        primaryTopicId: "t1",
        primaryTopicName: "Pricing",
      },
      {
        id: "p2",
        text: "Which CRM should a small team pick?",
        status: "Draft",
        source: "UserAdded",
        visibilityCheckId: "c1",
        visibilityCheckName: "Discovery",
        primaryTopicId: null,
        primaryTopicName: null,
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof PromptCheckGroup>;

export const Default: Story = {};
