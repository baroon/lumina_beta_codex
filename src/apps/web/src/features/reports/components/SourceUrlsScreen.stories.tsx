import type { Meta, StoryObj } from "@storybook/react";
import { SourceUrlsScreen } from "./SourceUrlsScreen";

const meta: Meta<typeof SourceUrlsScreen> = {
  title: "Features/Reports/SourceUrlsScreen",
  component: SourceUrlsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SourceUrlsScreen>;

export const Default: Story = {};
