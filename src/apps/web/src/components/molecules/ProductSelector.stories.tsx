import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ProductSelector } from "./ProductSelector";
import type { BrandedDimensionGroupDto } from "@/types/api";

function group(brandId: string, brandName: string, items: string[]): BrandedDimensionGroupDto {
  return {
    brandId,
    brandName,
    items: items.map((name, i) => ({ id: `${brandId}-${i}`, name })),
  };
}

const sampleGroups: BrandedDimensionGroupDto[] = [
  group("nostri", "Nostri", ["Indeed Premium", "Indeed Free"]),
  group("gensler", "Gensler", ["Resume Builder", "Indeed Hiring Insights"]),
];

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
        productsByBrand={sampleGroups}
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
      <ProductSelector productsByBrand={[]} selectedNames={[]} onChange={() => {}} />
    </div>
  ),
};
