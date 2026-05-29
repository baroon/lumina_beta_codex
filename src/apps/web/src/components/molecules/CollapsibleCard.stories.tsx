import type { Meta, StoryObj } from "@storybook/react";
import { Globe, PieChart } from "lucide-react";
import { CollapsibleCard } from "./CollapsibleCard";

const meta: Meta<typeof CollapsibleCard> = {
  title: "Molecules/CollapsibleCard",
  component: CollapsibleCard,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof CollapsibleCard>;

export const Default: Story = {
  render: () => (
    <div className="max-w-md p-8">
      <CollapsibleCard
        icon={PieChart}
        title="Share of voice"
        tooltip="Who got mentioned and how often."
      >
        <div className="h-40 rounded bg-neutral-50" />
      </CollapsibleCard>
    </div>
  ),
};

export const StartsCollapsed: Story = {
  render: () => (
    <div className="max-w-md p-8">
      <CollapsibleCard
        icon={Globe}
        title="Top citation domains"
        subtitle="Which third-party sites the models cite most often"
        tooltip="Domains the AI cited when answering your prompts."
        defaultOpen={false}
      >
        <div className="h-40 rounded bg-neutral-50" />
      </CollapsibleCard>
    </div>
  ),
};

export const WithActionsSlot: Story = {
  render: () => (
    <div className="max-w-md p-8">
      <CollapsibleCard
        icon={PieChart}
        title="Topic coverage"
        actions={<span className="text-xs text-neutral-500">12 topics</span>}
      >
        <div className="h-40 rounded bg-neutral-50" />
      </CollapsibleCard>
    </div>
  ),
};
