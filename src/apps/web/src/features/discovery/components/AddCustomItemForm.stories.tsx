import type { Meta, StoryObj } from "@storybook/react";
import { Package, Wrench, Puzzle, Lightbulb, Box, BookOpen } from "lucide-react";
import { AddCustomItemForm } from "./AddCustomItemForm";

const ICON_CLASS = "h-3.5 w-3.5";

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

export const WithTypeOptions: Story = {
  args: {
    typeOptions: [
      { value: "Product", label: "Product", icon: <Package className={ICON_CLASS} /> },
      { value: "Service", label: "Service", icon: <Wrench className={ICON_CLASS} /> },
      { value: "Feature", label: "Feature", icon: <Puzzle className={ICON_CLASS} /> },
      { value: "Solution", label: "Solution", icon: <Lightbulb className={ICON_CLASS} /> },
      { value: "Tool", label: "Tool", icon: <Box className={ICON_CLASS} /> },
      { value: "Resource", label: "Resource", icon: <BookOpen className={ICON_CLASS} /> },
    ],
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button");
    button?.click();
  },
};
