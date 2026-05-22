import type { Meta, StoryObj } from "@storybook/react";
import { ReadyToCreateTrackerScreen } from "./ReadyToCreateTrackerScreen";

const meta: Meta<typeof ReadyToCreateTrackerScreen> = {
  title: "Features/Trackers/ReadyToCreateTrackerScreen",
  component: ReadyToCreateTrackerScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ReadyToCreateTrackerScreen>;

export const Default: Story = {
  args: { brandId: "brand-123" },
};
