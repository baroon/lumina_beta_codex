import type { Meta, StoryObj } from "@storybook/react";
import { ConfidenceTag } from "./ConfidenceTag";
import { CONFIDENCE_THRESHOLDS } from "../confidence";

const meta: Meta<typeof ConfidenceTag> = {
  title: "Features/Discovery/ConfidenceTag",
  component: ConfidenceTag,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ConfidenceTag>;

export const High: Story = {
  args: { confidence: 0.85 },
};

export const HighAtThreshold: Story = {
  args: { confidence: CONFIDENCE_THRESHOLDS.high },
};

export const Medium: Story = {
  args: { confidence: 0.55 },
};

export const MediumAtThreshold: Story = {
  args: { confidence: CONFIDENCE_THRESHOLDS.medium },
};

export const Low: Story = {
  args: { confidence: 0.2 },
};
