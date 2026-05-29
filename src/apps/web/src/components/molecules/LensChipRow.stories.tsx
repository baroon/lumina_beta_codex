import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { LensChipRow } from "./LensChipRow";

function Demo({ initial }: { initial: string[] }) {
  const [sel, setSel] = useState<string[]>(initial);
  return (
    <div className="p-8">
      <LensChipRow
        selectedCodes={sel}
        onChange={setSel}
        countsByCode={{
          Discovery: 2,
          BuyingIntent: 0,
          CompetitorComparison: 10,
          SentimentAndTrust: 5,
          CitationVisibility: 0,
          ContentGaps: 0,
        }}
      />
    </div>
  );
}

const meta: Meta<typeof LensChipRow> = {
  title: "Molecules/LensChipRow",
  component: LensChipRow,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof LensChipRow>;

export const AllSelected: Story = { render: () => <Demo initial={[]} /> };
export const SomeSelected: Story = {
  render: () => <Demo initial={["Discovery", "BuyingIntent"]} />,
};
