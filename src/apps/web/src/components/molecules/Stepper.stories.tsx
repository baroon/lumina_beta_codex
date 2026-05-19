import type { Meta, StoryObj } from "@storybook/react";
import { Stepper } from "./Stepper";

const DEMO_STEPS = [
  { label: "Brand Identity" },
  { label: "Products" },
  { label: "Audiences" },
  { label: "Landscape" },
  { label: "Review" },
];

const meta: Meta<typeof Stepper> = {
  title: "Molecules/Stepper",
  component: Stepper,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[700px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Stepper>;

export const FirstStep: Story = {
  args: {
    steps: DEMO_STEPS,
    currentStep: 0,
    nextLabel: "Next",
    children: (
      <div className="rounded-lg border p-8 text-center text-neutral-500">Step 1 content</div>
    ),
  },
};

export const MiddleStep: Story = {
  args: {
    steps: DEMO_STEPS,
    currentStep: 2,
    nextLabel: "Next",
    backLabel: "Back",
    children: (
      <div className="rounded-lg border p-8 text-center text-neutral-500">Step 3 content</div>
    ),
  },
};

export const LastStep: Story = {
  args: {
    steps: DEMO_STEPS,
    currentStep: 4,
    nextLabel: "Confirm",
    backLabel: "Back",
    children: (
      <div className="rounded-lg border p-8 text-center text-neutral-500">Review content</div>
    ),
  },
};

export const Loading: Story = {
  args: {
    steps: DEMO_STEPS,
    currentStep: 3,
    isNextLoading: true,
    nextLabel: "Next",
    backLabel: "Back",
    children: (
      <div className="rounded-lg border p-8 text-center text-neutral-500">Loading state</div>
    ),
  },
};
