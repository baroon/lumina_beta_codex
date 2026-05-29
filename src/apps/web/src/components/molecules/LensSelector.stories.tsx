import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { LensSelector } from "./LensSelector";

function Demo({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  return (
    <div className="p-8">
      <LensSelector selectedCodes={selected} onChange={setSelected} />
      <p className="mt-3 text-xs text-neutral-500">
        Selected: {selected.length === 0 ? "(empty = all)" : selected.join(", ")}
      </p>
    </div>
  );
}

const meta: Meta<typeof LensSelector> = {
  title: "Molecules/LensSelector",
  component: LensSelector,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof LensSelector>;

export const AllSelected: Story = { render: () => <Demo initial={[]} /> };

export const SomeSelected: Story = {
  render: () => <Demo initial={["Discovery", "BuyingIntent"]} />,
};
