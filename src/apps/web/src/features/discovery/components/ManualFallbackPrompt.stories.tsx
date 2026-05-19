import type { Meta, StoryObj } from "@storybook/react";
import { ManualFallbackPrompt } from "./ManualFallbackPrompt";

const meta: Meta<typeof ManualFallbackPrompt> = {
  title: "Features/Discovery/ManualFallbackPrompt",
  component: ManualFallbackPrompt,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="w-96"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof ManualFallbackPrompt>;

export const Default: Story = {
  args: { message: "No products detected. Add your key products and services below." },
};
