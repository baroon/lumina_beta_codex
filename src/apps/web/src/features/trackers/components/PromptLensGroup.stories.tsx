import type { Meta, StoryObj } from "@storybook/react";
import { PromptLensGroup } from "./PromptLensGroup";

const meta: Meta<typeof PromptLensGroup> = {
  title: "Features/Trackers/PromptLensGroup",
  component: PromptLensGroup,
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
        lensId: "c1",
        lensName: "Discovery",
        topics: ["Pricing"],
        reviewReason: null,
      },
      {
        id: "p2",
        text: "Which CRM should a small team pick?",
        status: "Draft",
        source: "UserAdded",
        lensId: "c1",
        lensName: "Discovery",
        topics: [],
        reviewReason: null,
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof PromptLensGroup>;

export const Default: Story = {};
