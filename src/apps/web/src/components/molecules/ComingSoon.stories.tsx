import type { Meta, StoryObj } from "@storybook/react";
import { MessageSquare, TrendingUp } from "lucide-react";
import { ComingSoon } from "./ComingSoon";

const meta: Meta<typeof ComingSoon> = {
  title: "Molecules/ComingSoon",
  component: ComingSoon,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[640px] p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ComingSoon>;

export const Default: Story = {
  args: {
    title: "Prompts",
    description: "Per-prompt visibility, sentiment, position and mention counts.",
    icon: MessageSquare,
  },
};

export const WithBetaTag: Story = {
  args: {
    title: "Insights",
    description: "Narrative ranking and performance matrix across your brands.",
    icon: TrendingUp,
    beta: true,
  },
};

export const TitleOnly: Story = {
  args: { title: "Settings" },
};
