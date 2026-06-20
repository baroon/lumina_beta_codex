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

export const SecurityChecklistOpened: Story = {
  play: async ({ canvasElement }) => {
    const buttons = Array.from(canvasElement.querySelectorAll("button"));
    buttons.find((button) => button.textContent?.includes("Security settings"))?.click();
  },
};

export const PreferencesSaved: Story = {
  play: async ({ canvasElement }) => {
    const buttons = Array.from(canvasElement.querySelectorAll("button"));
    buttons.find((button) => button.textContent?.includes("Save changes"))?.click();
  },
};
