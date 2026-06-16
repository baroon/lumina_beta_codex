import type { Meta, StoryObj } from "@storybook/react";
import type { BrandCompetitiveGapGroupDto } from "@/types/api";
import { CompetitiveGapGroupsCard } from "./CompetitiveGapGroupsCard";

const meta: Meta<typeof CompetitiveGapGroupsCard> = {
  title: "Features/Reports/CompetitiveGapGroupsCard",
  component: CompetitiveGapGroupsCard,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof CompetitiveGapGroupsCard>;

const sample: BrandCompetitiveGapGroupDto[] = [
  {
    trackedBrandId: "acme",
    trackedBrandName: "Acme",
    gaps: [
      {
        competitorId: "canva",
        competitorName: "Canva",
        brandMentions: 22,
        competitorMentions: 30,
        mentionsGap: -8,
        brandRecommendations: 8,
        competitorRecommendations: 10,
        recommendationsGap: -2,
      },
      {
        competitorId: "figma",
        competitorName: "Figma",
        brandMentions: 22,
        competitorMentions: 12,
        mentionsGap: 10,
        brandRecommendations: 8,
        competitorRecommendations: 3,
        recommendationsGap: 5,
      },
    ],
  },
];

export const Default: Story = {
  args: { groups: sample },
};

export const Empty: Story = {
  args: { groups: [] },
};
