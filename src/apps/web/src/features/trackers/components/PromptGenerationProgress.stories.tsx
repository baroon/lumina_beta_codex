import type { Meta, StoryObj } from "@storybook/react";
import { PromptGenerationProgress } from "./PromptGenerationProgress";

const meta: Meta<typeof PromptGenerationProgress> = {
  title: "Features/Trackers/PromptGenerationProgress",
  component: PromptGenerationProgress,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof PromptGenerationProgress>;

export const WithBrand: Story = { args: { brandName: "Nostri" } };
export const Fallback: Story = { args: { brandName: "" } };
