import type { Meta, StoryObj } from "@storybook/react";
import { RotatingMessage } from "./RotatingMessage";

const meta: Meta<typeof RotatingMessage> = {
  title: "Molecules/RotatingMessage",
  component: RotatingMessage,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof RotatingMessage>;

export const Default: Story = {
  args: {
    messages: [
      "Visibility Lenses look at your brand through 6 angles.",
      "A Tracker is a long-lived view of how AI talks about your brand.",
      "Citations show you which sources AI reaches for in your category.",
    ],
    intervalMs: 3000,
  },
};

export const Single: Story = {
  args: { messages: ["Just one message — no rotation."] },
};
