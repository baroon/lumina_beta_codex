import type { Meta, StoryObj } from "@storybook/react";
import type { EntityMentionDto } from "@/types/api";
import { BrandVsCompetitorCard } from "./BrandVsCompetitorCard";

const meta: Meta<typeof BrandVsCompetitorCard> = {
  title: "Features/Reports/BrandVsCompetitorCard",
  component: BrandVsCompetitorCard,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof BrandVsCompetitorCard>;

const sample: EntityMentionDto[] = [
  {
    entityType: "Brand",
    entityId: "acme",
    name: "Acme",
    isTrackedBrand: true,
    mentionCount: 42,
    share: 0.45,
  },
  {
    entityType: "Competitor",
    entityId: "canva",
    name: "Canva",
    isTrackedBrand: false,
    mentionCount: 28,
    share: 0.3,
  },
  {
    entityType: "Competitor",
    entityId: "figma",
    name: "Figma",
    isTrackedBrand: false,
    mentionCount: 17,
    share: 0.18,
  },
];

export const Default: Story = { args: { mentions: sample } };
export const Empty: Story = { args: { mentions: [] } };
export const Filtered: Story = {
  args: { mentions: sample, selectedKeys: ["Brand:acme", "Competitor:canva"] },
};
