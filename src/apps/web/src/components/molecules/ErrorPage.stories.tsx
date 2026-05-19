import type { Meta, StoryObj } from "@storybook/react";
import { ErrorPage } from "./ErrorPage";

const meta: Meta<typeof ErrorPage> = {
  title: "Molecules/ErrorPage",
  component: ErrorPage,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ErrorPage>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: new Error("Network request failed: 500 Internal Server Error"),
  },
};

export const WithReset: Story = {
  args: {
    error: new Error("Something went wrong"),
    onReset: () => alert("Reset clicked"),
  },
};
