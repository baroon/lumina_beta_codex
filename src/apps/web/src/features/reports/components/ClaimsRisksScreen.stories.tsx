import type { Meta, StoryObj } from "@storybook/react";
import { ClaimsRisksScreen } from "./ClaimsRisksScreen";

const meta: Meta<typeof ClaimsRisksScreen> = {
  title: "Features/Reports/ClaimsRisksScreen",
  component: ClaimsRisksScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ClaimsRisksScreen>;

export const Default: Story = {};
