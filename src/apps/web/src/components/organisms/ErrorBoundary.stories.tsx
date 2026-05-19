import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ErrorBoundary } from "./ErrorBoundary";

function ThrowError(): React.ReactElement {
  throw new Error("Test error from story");
}

const meta: Meta<typeof ErrorBoundary> = {
  title: "Organisms/ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

export const WithoutError: Story = {
  args: {
    children: (
      <div className="rounded-lg border border-neutral-200 p-6 text-center text-sm text-neutral-500">
        Content renders normally when there is no error.
      </div>
    ),
  },
};

export const WithError: Story = {
  args: {
    children: <ThrowError />,
  },
};
