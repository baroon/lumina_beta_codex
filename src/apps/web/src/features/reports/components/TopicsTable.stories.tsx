import type { Meta, StoryObj } from "@storybook/react";
import type { TopicListItemDto } from "@/types/api";
import { TopicsTable } from "./TopicsTable";

const topics: TopicListItemDto[] = [
  {
    topicId: "t1",
    topicName: "Sustainable Design",
    brandMentionRate: 0.45,
    brandRecommendationRate: 0.2,
    brandShareOfVoice: 0.55,
    averageBrandRank: 2.3,
    citationCount: 12,
    ownedCitationShare: 0.25,
    dominantSentiment: "Positive",
    ownershipScore: 0.45,
    ownershipBand: "Contested",
  },
  {
    topicId: "t2",
    topicName: "Urban Planning",
    brandMentionRate: 0.1,
    brandRecommendationRate: 0.0,
    brandShareOfVoice: 0.25,
    averageBrandRank: null,
    citationCount: 4,
    ownedCitationShare: 0.0,
    dominantSentiment: "Neutral",
    ownershipScore: 0.1,
    ownershipBand: "Lost",
  },
  {
    topicId: "t3",
    topicName: "Topic With No Data",
    brandMentionRate: null,
    brandRecommendationRate: null,
    brandShareOfVoice: null,
    averageBrandRank: null,
    citationCount: 0,
    ownedCitationShare: null,
    dominantSentiment: null,
    ownershipScore: 0.0,
    ownershipBand: "Lost",
  },
];

const meta: Meta<typeof TopicsTable> = {
  title: "Features/Reports/TopicsTable",
  component: TopicsTable,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof TopicsTable>;

export const Default: Story = {
  args: { topics, onSelectTopic: () => {} },
};

export const Empty: Story = {
  args: { topics: [], onSelectTopic: () => {} },
};
