import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TopicSelector } from "./TopicSelector";
import type { BrandedDimensionGroupDto } from "@/types/api";

function group(brandId: string, brandName: string, items: string[]): BrandedDimensionGroupDto {
  return {
    brandId,
    brandName,
    items: items.map((name, i) => ({ id: `${brandId}-${i}`, name })),
  };
}

const sampleGroups: BrandedDimensionGroupDto[] = [
  group("nostri", "Nostri", ["Salary trends", "Remote work", "Career growth"]),
  group("gensler", "Gensler", ["Interviewing", "Office culture", "Salary trends"]),
  group("hok", "HOK", ["Benefits"]),
];

const sampleCounts = {
  "Salary trends": 12,
  "Remote work": 8,
  "Career growth": 0,
  Interviewing: 3,
  "Office culture": 1,
  Benefits: 0,
};

function Demo({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  return (
    <div className="p-8">
      <TopicSelector
        topicsByBrand={sampleGroups}
        selectedNames={selected}
        onChange={setSelected}
        countsByName={sampleCounts}
      />
      <p className="mt-3 text-xs text-neutral-500">
        Selected: {selected.length === 0 ? "(empty = all)" : selected.join(", ")}
      </p>
    </div>
  );
}

const meta: Meta<typeof TopicSelector> = {
  title: "Molecules/TopicSelector",
  component: TopicSelector,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof TopicSelector>;

export const AllSelected: Story = { render: () => <Demo initial={[]} /> };
export const SomeSelected: Story = {
  render: () => <Demo initial={["Salary trends", "Remote work"]} />,
};

export const EmptyWorkspace: Story = {
  render: () => (
    <div className="p-8">
      <TopicSelector topicsByBrand={[]} selectedNames={[]} onChange={() => {}} />
    </div>
  ),
};
