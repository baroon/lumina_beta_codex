import type { Meta, StoryObj } from "@storybook/react";
import { WorkspaceSettingsScreen } from "./WorkspaceSettingsScreen";

const meta: Meta<typeof WorkspaceSettingsScreen> = {
  title: "Features/Settings/WorkspaceSettingsScreen",
  component: WorkspaceSettingsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WorkspaceSettingsScreen>;

export const Default: Story = {};
