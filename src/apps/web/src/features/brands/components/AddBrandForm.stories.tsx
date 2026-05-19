import type { Meta, StoryObj } from "@storybook/react";
import { AddBrandForm } from "./AddBrandForm";

const meta: Meta<typeof AddBrandForm> = {
  title: "Features/Brands/AddBrandForm",
  component: AddBrandForm,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AddBrandForm>;

export const Default: Story = {};
