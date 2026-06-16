import type { Meta, StoryObj } from "@storybook/react";
import type { EntityMentionDto } from "@/types/api";
import { ShareOfVoiceCard } from "./ShareOfVoiceCard";

const meta: Meta<typeof ShareOfVoiceCard> = {
  title: "Features/Reports/ShareOfVoiceCard",
  component: ShareOfVoiceCard,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof ShareOfVoiceCard>;

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
  {
    entityType: "Competitor",
    entityId: "miro",
    name: "Miro",
    isTrackedBrand: false,
    mentionCount: 6,
    share: 0.07,
  },
];

export const Default: Story = {
  args: { mentions: sample },
};

export const Empty: Story = {
  args: { mentions: [] },
};

export const Filtered: Story = {
  args: {
    mentions: sample,
    selectedKeys: ["Brand:acme", "Competitor:canva"],
  },
};
