import type { Meta, StoryObj } from "@storybook/react";
import { PromptReviewScreen } from "./PromptReviewScreen";

const meta: Meta<typeof PromptReviewScreen> = {
  title: "Features/Trackers/PromptReviewScreen",
  component: PromptReviewScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PromptReviewScreen>;

export const Default: Story = {
  args: { trackerId: "tracker-123" },
};
