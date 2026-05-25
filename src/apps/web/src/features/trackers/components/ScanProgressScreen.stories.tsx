import type { Meta, StoryObj } from "@storybook/react";
import { ScanProgressScreen } from "./ScanProgressScreen";

const meta: Meta<typeof ScanProgressScreen> = {
  title: "Features/Trackers/ScanProgressScreen",
  component: ScanProgressScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ScanProgressScreen>;

export const Default: Story = {
  args: { trackerId: "tracker-123" },
};
