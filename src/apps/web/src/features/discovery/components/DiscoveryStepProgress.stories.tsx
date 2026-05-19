import type { Meta, StoryObj } from "@storybook/react";
import { DiscoveryStepProgress } from "./DiscoveryStepProgress";

const meta: Meta<typeof DiscoveryStepProgress> = {
  title: "Features/Discovery/DiscoveryStepProgress",
  component: DiscoveryStepProgress,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DiscoveryStepProgress>;

export const Step1: Story = {
  args: { step: 1, totalSteps: 5 },
};

export const Step3: Story = {
  args: { step: 3, totalSteps: 5 },
};

export const Step5: Story = {
  args: { step: 5, totalSteps: 5 },
};
