import type { Meta, StoryObj } from "@storybook/react";
import { TrackerEditScreen } from "./TrackerEditScreen";

const meta: Meta<typeof TrackerEditScreen> = {
  title: "Features/Trackers/TrackerEditScreen",
  component: TrackerEditScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TrackerEditScreen>;

export const Default: Story = {
  args: { brandId: "b1", trackerId: "t1" },
};
