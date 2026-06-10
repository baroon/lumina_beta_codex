import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumb } from "./Breadcrumb";

const meta: Meta<typeof Breadcrumb> = {
  title: "Molecules/Breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const TwoLevels: Story = {
  args: {
    items: [{ label: "Workspace", to: "/overview" }, { label: "Brands" }],
  },
};

export const ScanDetailTrail: Story = {
  args: {
    items: [
      { label: "Workspace", to: "/overview" },
      {
        label: "Acme Corp",
        to: "/brands/$brandId/profile",
        params: { brandId: "b-1" },
      },
      {
        label: "Q3 2026 Tracker",
        to: "/brands/$brandId/trackers/$trackerId",
        params: { brandId: "b-1", trackerId: "t-1" },
      },
      { label: "Scan Run · 2026-06-10" },
    ],
  },
};

export const LoadingState: Story = {
  args: {
    items: [
      { label: "Workspace", to: "/overview" },
      // Async-resolved labels still loading — skeleton segments hold the layout.
      { to: "/brands/$brandId/profile", params: { brandId: "b-1" } },
      { to: "/brands/$brandId/trackers/$trackerId", params: { brandId: "b-1", trackerId: "t-1" } },
      {},
    ],
  },
};

export const SingleItem: Story = {
  args: {
    items: [{ label: "Workspace" }],
  },
};
