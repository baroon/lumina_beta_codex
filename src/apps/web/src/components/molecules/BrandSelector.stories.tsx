import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { BrandSelector, type BrandSelectorEntity } from "./BrandSelector";

const trackedBrands: BrandSelectorEntity[] = [
  { id: "brand-1", entityType: "Brand", name: "Monster" },
];

const competitors: BrandSelectorEntity[] = [
  { id: "c-1", entityType: "Competitor", name: "BoldPro" },
  { id: "c-2", entityType: "Competitor", name: "CareerBuilder" },
  { id: "c-3", entityType: "Competitor", name: "Fiverr" },
  { id: "c-4", entityType: "Competitor", name: "FlexJobs" },
  { id: "c-5", entityType: "Competitor", name: "Glassdoor" },
  { id: "c-6", entityType: "Competitor", name: "GovernmentJobs" },
  { id: "c-7", entityType: "Competitor", name: "Indeed" },
  { id: "c-8", entityType: "Competitor", name: "Jobs2Careers" },
  { id: "c-9", entityType: "Competitor", name: "LinkedIn" },
];

const keys = [...trackedBrands, ...competitors].map((e) => `${e.entityType}:${e.id}`);

function Demo({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  return (
    <div className="p-8">
      <BrandSelector
        trackedBrands={trackedBrands}
        competitors={competitors}
        selectedKeys={selected}
        onChange={setSelected}
      />
      <p className="mt-3 text-xs text-neutral-500">Selected: {selected.length} keys</p>
    </div>
  );
}

const meta: Meta<typeof BrandSelector> = {
  title: "Molecules/BrandSelector",
  component: BrandSelector,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof BrandSelector>;

export const AllSelected: Story = {
  render: () => <Demo initial={keys} />,
};

export const PartiallySelected: Story = {
  render: () => <Demo initial={[keys[0], keys[2], keys[5]]} />,
};

export const TrackedBrandOnly: Story = {
  render: () => <Demo initial={[`${trackedBrands[0].entityType}:${trackedBrands[0].id}`]} />,
};

export const EmptyWorkspace: Story = {
  render: () => (
    <div className="p-8">
      <BrandSelector trackedBrands={[]} competitors={[]} selectedKeys={[]} onChange={() => {}} />
    </div>
  ),
};
