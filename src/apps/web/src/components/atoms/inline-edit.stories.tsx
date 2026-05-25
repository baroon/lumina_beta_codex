import type { Meta, StoryObj } from "@storybook/react";
import { InlineEdit } from "./inline-edit";

const meta: Meta<typeof InlineEdit> = {
  title: "Atoms/InlineEdit",
  component: InlineEdit,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof InlineEdit>;

export const Default: Story = {
  args: {
    value: "SaaS",
    onChange: () => {},
  },
};

export const Empty: Story = {
  args: {
    value: "",
    placeholder: "Click to edit",
    onChange: () => {},
  },
};

export const Multiline: Story = {
  args: {
    value:
      "What are the best CRM options for a small team weighing pricing, onboarding, and support quality?",
    multiline: true,
    onChange: () => {},
  },
};
