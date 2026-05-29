import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MarketSelector } from "./MarketSelector";

const markets = ["United States", "United Kingdom", "India", "Canada"];
const counts = {
  "United States": 22,
  "United Kingdom": 9,
  India: 0,
  Canada: 4,
};

function Demo({ initial }: { initial: string[] }) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <div className="p-8">
      <MarketSelector
        allMarketNames={markets}
        selectedNames={v}
        onChange={setV}
        countsByName={counts}
      />
      <p className="mt-3 text-xs text-neutral-500">
        Selected: {v.length === 0 ? "(empty = all)" : v.join(", ")}
      </p>
    </div>
  );
}

const meta: Meta<typeof MarketSelector> = {
  title: "Molecules/MarketSelector",
  component: MarketSelector,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof MarketSelector>;

export const AllSelected: Story = { render: () => <Demo initial={[]} /> };
export const SomeSelected: Story = { render: () => <Demo initial={["United States"]} /> };
export const EmptyWorkspace: Story = {
  render: () => (
    <div className="p-8">
      <MarketSelector allMarketNames={[]} selectedNames={[]} onChange={() => {}} />
    </div>
  ),
};
