import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { SourceTypeReferenceDto } from "@/types/api";
import { SourceTypeDropdown } from "./SourceTypeDropdown";

const sourceTypes: SourceTypeReferenceDto[] = [
  {
    id: "1",
    code: "Owned",
    name: "Owned",
    description: "The brand's own properties.",
    displayOrder: 1,
  },
  {
    id: "2",
    code: "Competitor",
    name: "Competitor",
    description: "A tracked competitor's own properties.",
    displayOrder: 2,
  },
  {
    id: "3",
    code: "Editorial",
    name: "Editorial",
    description: "News articles, magazine pieces.",
    displayOrder: 5,
  },
  {
    id: "4",
    code: "ReviewSite",
    name: "Review Site",
    description: "G2, Trustpilot, Capterra.",
    displayOrder: 6,
  },
  {
    id: "5",
    code: "Reference",
    name: "Reference",
    description: "Wikipedia, encyclopedias.",
    displayOrder: 9,
  },
  {
    id: "6",
    code: "Unknown",
    name: "Unknown",
    description: "Not classified yet.",
    displayOrder: 12,
  },
];

function InteractiveDropdown({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <SourceTypeDropdown value={value} onChange={setValue} sourceTypes={sourceTypes} />;
}

const meta: Meta<typeof SourceTypeDropdown> = {
  title: "Molecules/SourceTypeDropdown",
  component: SourceTypeDropdown,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof SourceTypeDropdown>;

export const Default: Story = {
  render: () => <InteractiveDropdown initial="Editorial" />,
};

export const Disabled: Story = {
  args: {
    value: "Owned",
    onChange: () => {},
    sourceTypes,
    disabled: true,
  },
};

export const UnknownValue: Story = {
  // Defensive case: value not in the reference set. Shouldn't crash;
  // surfaces as the literal value so the user can re-pick.
  render: () => <InteractiveDropdown initial="OutOfTaxonomy" />,
};
