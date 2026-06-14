import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { LensChipRow } from "./LensChipRow";

const ALL_CODES = [
  "Discovery",
  "BuyingIntent",
  "CompetitorComparison",
  "SentimentAndTrust",
  "CitationVisibility",
  "ContentGaps",
];

function Demo({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  return (
    <div className="p-8">
      <LensChipRow
        selectedCodes={selected}
        onChange={setSelected}
        onActivate={(code) => console.log("scrollTo", code)}
        countsByCode={{
          Discovery: 798,
          BuyingIntent: 776,
          CompetitorComparison: 801,
          SentimentAndTrust: 770,
          CitationVisibility: 394,
          ContentGaps: 397,
        }}
      />
      <p className="mt-4 text-xs text-neutral-500">
        Selected: {selected.length === 6 ? "all 6 (default)" : selected.join(", ")}
      </p>
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

export const AllSelected: Story = { render: () => <Demo initial={ALL_CODES} /> };
export const SingleSelected: Story = { render: () => <Demo initial={["Discovery"]} /> };
export const SentimentFocused: Story = {
  render: () => <Demo initial={["SentimentAndTrust"]} />,
};
