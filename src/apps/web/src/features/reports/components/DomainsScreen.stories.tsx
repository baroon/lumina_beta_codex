import type { Meta, StoryObj } from "@storybook/react";
import { DomainsScreen } from "./DomainsScreen";

const meta: Meta<typeof DomainsScreen> = {
  title: "Features/Reports/DomainsScreen",
  component: DomainsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DomainsScreen>;

export const Default: Story = {};
