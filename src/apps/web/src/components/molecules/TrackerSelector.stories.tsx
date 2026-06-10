import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { TrackerScope } from "@/hooks/useTrackerScope";
import { TrackerSelector, type BrandGroup } from "./TrackerSelector";

const TWO_BRAND_FIXTURE: BrandGroup[] = [
  {
    brandId: "b-acme",
    brandName: "Acme",
    trackers: [
      { id: "t-acme-us", name: "Acme · US Tracker", hasScans: true },
      { id: "t-acme-eu", name: "Acme · EU Tracker", hasScans: true },
      { id: "t-acme-new", name: "Acme · Brand-new Tracker", hasScans: false },
    ],
  },
  {
    brandId: "b-bold",
    brandName: "BOLD",
    trackers: [
      { id: "t-bold-docs", name: "BOLD · Docs", hasScans: true },
      { id: "t-bold-jobs", name: "BOLD · Jobs", hasScans: true },
    ],
  },
];

const meta: Meta<typeof TrackerSelector> = {
  title: "Molecules/TrackerSelector",
  component: TrackerSelector,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[280px] p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TrackerSelector>;

const Stateful = ({ brands, initial }: { brands: BrandGroup[]; initial: TrackerScope }) => {
  const [scope, setScope] = useState<TrackerScope>(initial);
  return <TrackerSelector brands={brands} scope={scope} onScopeChange={setScope} />;
};

export const AllSelectedDefault: Story = {
  render: () => <Stateful brands={TWO_BRAND_FIXTURE} initial="all" />,
};

export const PartialSelection: Story = {
  render: () => <Stateful brands={TWO_BRAND_FIXTURE} initial={["t-acme-us", "t-bold-docs"]} />,
};

export const NoneSelected: Story = {
  render: () => <Stateful brands={TWO_BRAND_FIXTURE} initial={[]} />,
};

export const SingleTrackerFocus: Story = {
  render: () => <Stateful brands={TWO_BRAND_FIXTURE} initial={["t-acme-us"]} />,
};

export const NoTrackersYet: Story = {
  render: () => (
    <TrackerSelector
      brands={[]}
      scope="all"
      onScopeChange={() => {}}
      onAddBrand={() => alert("Add brand clicked")}
    />
  ),
};

export const SingleBrandSingleTracker: Story = {
  render: () => (
    <Stateful
      brands={[
        {
          brandId: "b-solo",
          brandName: "Solo Brand",
          trackers: [{ id: "t-solo", name: "Main Tracker", hasScans: true }],
        },
      ]}
      initial="all"
    />
  ),
};
