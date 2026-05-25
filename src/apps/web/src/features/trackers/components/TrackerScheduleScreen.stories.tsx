import type { Meta, StoryObj } from "@storybook/react";
import { TrackerScheduleScreen } from "./TrackerScheduleScreen";

const meta: Meta<typeof TrackerScheduleScreen> = {
  title: "Features/Trackers/TrackerScheduleScreen",
  component: TrackerScheduleScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TrackerScheduleScreen>;

export const Default: Story = {
  args: { trackerId: "tracker-123" },
};
