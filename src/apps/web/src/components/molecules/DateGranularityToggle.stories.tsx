import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DateGranularityToggle, type DateGranularity } from "./DateGranularityToggle";

function Demo({ initial }: { initial: DateGranularity }) {
  const [v, setV] = useState<DateGranularity>(initial);
  return (
    <div className="p-8">
      <DateGranularityToggle value={v} onChange={setV} />
      <p className="mt-3 text-xs text-neutral-500">Granularity: {v}</p>
    </div>
  );
}

const meta: Meta<typeof DateGranularityToggle> = {
  title: "Molecules/DateGranularityToggle",
  component: DateGranularityToggle,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof DateGranularityToggle>;

export const Day: Story = { render: () => <Demo initial="day" /> };
export const Week: Story = { render: () => <Demo initial="week" /> };
export const Month: Story = { render: () => <Demo initial="month" /> };
