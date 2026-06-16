import type { Meta, StoryObj } from "@storybook/react";
import type { EntityRateDto } from "@/types/api";
import { RecommendationRateCard } from "./RecommendationRateCard";

const meta: Meta<typeof RecommendationRateCard> = {
  title: "Features/Reports/RecommendationRateCard",
  component: RecommendationRateCard,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof RecommendationRateCard>;

const sample: EntityRateDto[] = [
  {
    entityType: "Brand",
    entityId: "acme",
    name: "Acme",
    isTrackedBrand: true,
    mentionCount: 40,
    recommendationRate: 0.45,
  },
  {
    entityType: "Competitor",
    entityId: "canva",
    name: "Canva",
    isTrackedBrand: false,
    mentionCount: 30,
    recommendationRate: 0.6,
  },
  {
    entityType: "Competitor",
    entityId: "figma",
    name: "Figma",
    isTrackedBrand: false,
    mentionCount: 12,
    recommendationRate: 0.25,
  },
];

export const Default: Story = {
  args: { rates: sample },
};

export const Empty: Story = {
  args: { rates: [] },
};

export const NullRates: Story = {
  args: {
    rates: sample.map((r) => ({ ...r, recommendationRate: null })),
  },
};
