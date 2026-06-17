import type { Meta, StoryObj } from "@storybook/react";
import type { DomainTypeShareDto } from "@/types/api";
import { DomainTypesCard } from "./DomainTypesCard";

const meta: Meta<typeof DomainTypesCard> = {
  title: "Features/Reports/DomainTypesCard",
  component: DomainTypesCard,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof DomainTypesCard>;

const sample: DomainTypeShareDto[] = [
  { sourceType: "Editorial", citationCount: 220, share: 0.55 },
  { sourceType: "Owned", citationCount: 90, share: 0.22 },
  { sourceType: "UGC", citationCount: 50, share: 0.13 },
  { sourceType: "Reference", citationCount: 40, share: 0.1 },
];

export const Default: Story = { args: { rows: sample } };
export const Empty: Story = { args: { rows: [] } };
