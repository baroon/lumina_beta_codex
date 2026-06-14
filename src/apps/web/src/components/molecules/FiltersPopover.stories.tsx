import type { Meta, StoryObj } from "@storybook/react";
import { FiltersPopover, FiltersPopoverRow } from "./FiltersPopover";

function StubSelector({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm"
    >
      <span>{label}</span>
    </button>
  );
}

const meta: Meta<typeof FiltersPopover> = {
  title: "Molecules/FiltersPopover",
  component: FiltersPopover,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof FiltersPopover>;

export const Empty: Story = {
  render: () => (
    <div className="p-8">
      <FiltersPopover activeCount={0}>
        <FiltersPopoverRow label="Topics">
          <StubSelector label="All topics" />
        </FiltersPopoverRow>
        <FiltersPopoverRow label="Products & Services">
          <StubSelector label="All products & services" />
        </FiltersPopoverRow>
        <FiltersPopoverRow label="Markets">
          <StubSelector label="All markets" />
        </FiltersPopoverRow>
        <FiltersPopoverRow label="Audiences">
          <StubSelector label="All audiences" />
        </FiltersPopoverRow>
        <FiltersPopoverRow label="Trust signals" variant="reference">
          <StubSelector label="6 signals" />
        </FiltersPopoverRow>
      </FiltersPopover>
    </div>
  ),
};

export const WithActiveFilters: Story = {
  render: () => (
    <div className="p-8">
      <FiltersPopover activeCount={3} onClearAll={() => undefined}>
        <FiltersPopoverRow label="Topics" active>
          <StubSelector label="2 of 12 topics" />
        </FiltersPopoverRow>
        <FiltersPopoverRow label="Products & Services" active>
          <StubSelector label="1 of 10 products & services" />
        </FiltersPopoverRow>
        <FiltersPopoverRow label="Markets">
          <StubSelector label="All markets" />
        </FiltersPopoverRow>
        <FiltersPopoverRow label="Audiences" active>
          <StubSelector label="3 of 8 audiences" />
        </FiltersPopoverRow>
        <FiltersPopoverRow label="Trust signals" variant="reference">
          <StubSelector label="6 signals" />
        </FiltersPopoverRow>
      </FiltersPopover>
    </div>
  ),
};
