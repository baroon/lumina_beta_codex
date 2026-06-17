import type { Meta, StoryObj } from "@storybook/react";
import { ProfileSettingsScreen } from "./ProfileSettingsScreen";

const meta: Meta<typeof ProfileSettingsScreen> = {
  title: "Features/Settings/ProfileSettingsScreen",
  component: ProfileSettingsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ProfileSettingsScreen>;

export const Default: Story = {};
