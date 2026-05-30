import type { Meta, StoryObj } from "@storybook/react";
import { OnboardingStepper } from "./OnboardingStepper";

const meta: Meta<typeof OnboardingStepper> = {
  title: "Molecules/OnboardingStepper",
  component: OnboardingStepper,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof OnboardingStepper>;

export const FirstStep: Story = { args: { currentStep: 1, totalSteps: 5 } };
export const MiddleStep: Story = { args: { currentStep: 3, totalSteps: 5 } };
export const LastStep: Story = { args: { currentStep: 5, totalSteps: 5 } };
