import type { Meta, StoryObj } from "@storybook/react";
import { AddCustomItemForm } from "./AddCustomItemForm";

const meta: Meta<typeof AddCustomItemForm> = {
  title: "Features/Discovery/AddCustomItemForm",
  component: AddCustomItemForm,
  tags: ["autodocs"],
  args: {
    placeholder: "Add a product...",
    onAdd: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AddCustomItemForm>;

export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button");
    button?.click();
  },
};
