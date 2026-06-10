import type { Meta, StoryObj } from "@storybook/react";
import { TrackerHubScreen } from "./TrackerHubScreen";

const meta: Meta<typeof TrackerHubScreen> = {
  title: "Features/Trackers/TrackerHubScreen",
  component: TrackerHubScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TrackerHubScreen>;

export const Default: Story = {
  args: { brandId: "b1", trackerId: "t1" },
};
