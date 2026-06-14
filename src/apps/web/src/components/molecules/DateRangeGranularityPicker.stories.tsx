import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DateRangeGranularityPicker } from "./DateRangeGranularityPicker";
import { defaultDateRangeSelection, type DateRangeSelection } from "./DateRangePicker";
import type { DateGranularity } from "./DateGranularityToggle";

interface DemoProps {
  initialRange: DateRangeSelection;
  initialGranularity: DateGranularity;
}

function Demo({ initialRange, initialGranularity }: DemoProps) {
  const [range, setRange] = useState<DateRangeSelection>(initialRange);
  const [granularity, setGranularity] = useState<DateGranularity>(initialGranularity);
  return (
    <div className="p-8">
      <DateRangeGranularityPicker
        range={range}
        onRangeChange={setRange}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />
      <pre className="mt-4 rounded bg-neutral-50 p-3 text-xs text-neutral-600">
        {JSON.stringify({ range, granularity }, null, 2)}
      </pre>
    </div>
  );
}

const meta: Meta<typeof DateRangeGranularityPicker> = {
  title: "Molecules/DateRangeGranularityPicker",
  component: DateRangeGranularityPicker,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DateRangeGranularityPicker>;

export const Default: Story = {
  render: () => <Demo initialRange={defaultDateRangeSelection()} initialGranularity="week" />,
};

export const DailyLast7: Story = {
  render: () => <Demo initialRange={{ kind: "preset", days: 7 }} initialGranularity="day" />,
};

export const MonthlyAllTime: Story = {
  render: () => <Demo initialRange={{ kind: "all" }} initialGranularity="month" />,
};
