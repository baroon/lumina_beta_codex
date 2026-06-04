import type { Meta, StoryObj } from "@storybook/react";
import type { CompetitorListItemDto } from "@/types/api";
import { CompetitorsTable } from "./CompetitorsTable";

const competitors: CompetitorListItemDto[] = [
  {
    competitorId: "c1",
    name: "Acme",
    domain: "acme.com",
    mentionCount: 12,
    recommendationCount: 4,
    mentionRate: 0.4,
    recommendationRate: 0.33,
    shareOfVoice: 0.6,
  },
  {
    competitorId: "c2",
    name: "Beta",
    domain: "beta.com",
    mentionCount: 5,
    recommendationCount: 0,
    mentionRate: 0.16,
    recommendationRate: 0,
    shareOfVoice: 0.25,
  },
  {
    competitorId: "c3",
    name: "Gamma",
    domain: null,
    mentionCount: 0,
    recommendationCount: 0,
    mentionRate: 0,
    recommendationRate: null,
    shareOfVoice: null,
  },
];

const meta: Meta<typeof CompetitorsTable> = {
  title: "Features/Reports/CompetitorsTable",
  component: CompetitorsTable,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof CompetitorsTable>;

export const Default: Story = {
  args: { competitors, onSelectCompetitor: () => {} },
};

export const Empty: Story = {
  args: { competitors: [], onSelectCompetitor: () => {} },
};
