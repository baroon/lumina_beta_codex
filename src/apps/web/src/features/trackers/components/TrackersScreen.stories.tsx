import type { Meta, StoryObj } from "@storybook/react";
import { TrackersScreen } from "./TrackersScreen";

const meta: Meta<typeof TrackersScreen> = {
  title: "Features/Trackers/TrackersScreen",
  component: TrackersScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TrackersScreen>;

export const Default: Story = {};
