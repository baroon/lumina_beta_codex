import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  DateRangePicker,
  defaultDateRangeSelection,
  resolveDateRange,
  type DateRangeSelection,
} from "./DateRangePicker";

function Demo({ initial }: { initial: DateRangeSelection }) {
  const [sel, setSel] = useState<DateRangeSelection>(initial);
  const range = resolveDateRange(sel);
  return (
    <div className="p-8">
      <DateRangePicker value={sel} onChange={setSel} />
      <pre className="mt-4 rounded bg-neutral-50 p-3 text-xs text-neutral-600">
        {JSON.stringify(
          {
            selection: sel,
            resolved: {
              from: range.from?.toISOString() ?? null,
              to: range.to?.toISOString() ?? null,
            },
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

const meta: Meta<typeof DateRangePicker> = {
  title: "Molecules/DateRangePicker",
  component: DateRangePicker,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DateRangePicker>;

export const Default: Story = {
  render: () => <Demo initial={defaultDateRangeSelection()} />,
};

export const Last7Days: Story = {
  render: () => <Demo initial={{ kind: "preset", days: 7 }} />,
};

export const AllTime: Story = {
  render: () => <Demo initial={{ kind: "all" }} />,
};

export const CustomRange: Story = {
  render: () => (
    <Demo
      initial={{
        kind: "custom",
        from: new Date(2026, 4, 1),
        to: new Date(2026, 4, 28),
      }}
    />
  ),
};
