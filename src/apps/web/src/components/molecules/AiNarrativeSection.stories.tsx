import type { Meta, StoryObj } from "@storybook/react";
import { AiNarrativeSection } from "./AiNarrativeSection";
import { defaultDateRangeSelection } from "./DateRangePicker";

const meta: Meta<typeof AiNarrativeSection> = {
  title: "Molecules/AiNarrativeSection",
  component: AiNarrativeSection,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AiNarrativeSection>;

// Note: the underlying mutation is real here — these stories assume
// the API isn't reachable, so the only useful state to look at in
// Storybook is the initial "Generate" affordance. Pending/loaded/error
// variants would need MSW or a hook override and are covered by
// component tests instead.
export const Idle: Story = {
  args: {
    selection: defaultDateRangeSelection(),
    trackerIds: [],
    hasData: true,
  },
};

export const HiddenWhenNoData: Story = {
  args: {
    selection: defaultDateRangeSelection(),
    trackerIds: [],
    hasData: false,
  },
};
