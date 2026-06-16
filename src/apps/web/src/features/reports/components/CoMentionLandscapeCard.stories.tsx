import type { Meta, StoryObj } from "@storybook/react";
import type { WorkspaceCoMentionDto } from "@/types/api";
import { CoMentionLandscapeCard } from "./CoMentionLandscapeCard";

const meta: Meta<typeof CoMentionLandscapeCard> = {
  title: "Features/Reports/CoMentionLandscapeCard",
  component: CoMentionLandscapeCard,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof CoMentionLandscapeCard>;

const sample: WorkspaceCoMentionDto[] = [
  {
    competitorId: "canva",
    competitorName: "Canva",
    coMentionCount: 18,
    competitorMentionCount: 30,
  },
  {
    competitorId: "figma",
    competitorName: "Figma",
    coMentionCount: 7,
    competitorMentionCount: 12,
  },
  {
    competitorId: "miro",
    competitorName: "Miro",
    coMentionCount: 3,
    competitorMentionCount: 8,
  },
];

export const Default: Story = { args: { rows: sample } };
export const Empty: Story = { args: { rows: [] } };
export const Filtered: Story = {
  args: { rows: sample, selectedKeys: ["Competitor:canva"] },
};
