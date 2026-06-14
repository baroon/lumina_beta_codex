import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EntityScopeToggle, type EntityScope } from "./EntityScopeToggle";

function Demo({ initial }: { initial: EntityScope }) {
  const [value, setValue] = useState<EntityScope>(initial);
  return (
    <div className="p-8">
      <EntityScopeToggle value={value} onChange={setValue} />
      <p className="mt-4 text-xs text-neutral-600">Selected: {value}</p>
    </div>
  );
}

const meta: Meta<typeof EntityScopeToggle> = {
  title: "Molecules/EntityScopeToggle",
  component: EntityScopeToggle,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof EntityScopeToggle>;

export const All: Story = { render: () => <Demo initial="all" /> };
export const Tracked: Story = { render: () => <Demo initial="tracked" /> };
export const Top5: Story = { render: () => <Demo initial="top5" /> };
