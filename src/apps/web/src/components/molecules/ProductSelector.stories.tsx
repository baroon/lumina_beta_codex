import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ProductSelector } from "./ProductSelector";

const products = ["Indeed Premium", "Indeed Free", "Resume Builder", "Indeed Hiring Insights"];
const counts = {
  "Indeed Premium": 24,
  "Indeed Free": 18,
  "Resume Builder": 0,
  "Indeed Hiring Insights": 6,
};

function Demo({ initial }: { initial: string[] }) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <div className="p-8">
      <ProductSelector
        allProductNames={products}
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

const meta: Meta<typeof ProductSelector> = {
  title: "Molecules/ProductSelector",
  component: ProductSelector,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ProductSelector>;

export const AllSelected: Story = { render: () => <Demo initial={[]} /> };
export const SomeSelected: Story = {
  render: () => <Demo initial={["Indeed Premium"]} />,
};
export const EmptyWorkspace: Story = {
  render: () => (
    <div className="p-8">
      <ProductSelector allProductNames={[]} selectedNames={[]} onChange={() => {}} />
    </div>
  ),
};
