import type { Meta, StoryObj } from "@storybook/react";
import { ConfidenceTag } from "./ConfidenceTag";

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

export const Medium: Story = {
  args: { confidence: 0.55 },
};

export const Low: Story = {
  args: { confidence: 0.2 },
};
