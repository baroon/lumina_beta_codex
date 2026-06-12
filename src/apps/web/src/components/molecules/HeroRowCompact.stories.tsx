import type { Meta, StoryObj } from "@storybook/react";
import { HeroRowCompact } from "./HeroRowCompact";

const meta: Meta<typeof HeroRowCompact> = {
  title: "Molecules/HeroRowCompact",
  component: HeroRowCompact,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof HeroRowCompact>;

export const WithDeltas: Story = {
  args: {
    hero: {
      queries: 120,
      mentions: 45,
      citations: 18,
      brandMentionRate: 0.42,
      brandAbsenceRate: null,
      brandFirstMentionRate: null,
    },
    previousHero: {
      queries: 90,
      mentions: 30,
      citations: 10,
      brandMentionRate: 0.3,
      brandAbsenceRate: null,
      brandFirstMentionRate: null,
    },
  },
};

export const FirstWindow: Story = {
  args: {
    hero: {
      queries: 60,
      mentions: 15,
      citations: 4,
      brandMentionRate: 0.25,
      brandAbsenceRate: null,
      brandFirstMentionRate: null,
    },
    previousHero: null,
  },
};

export const ZeroBaselineNewBadge: Story = {
  args: {
    hero: {
      queries: 50,
      mentions: 12,
      citations: 3,
      brandMentionRate: 0.2,
      brandAbsenceRate: null,
      brandFirstMentionRate: null,
    },
    previousHero: {
      queries: 0,
      mentions: 0,
      citations: 0,
      brandMentionRate: null,
      brandAbsenceRate: null,
      brandFirstMentionRate: null,
    },
  },
};

export const NullBrandMentionRate: Story = {
  args: {
    hero: {
      queries: 8,
      mentions: 0,
      citations: 0,
      brandMentionRate: null,
      brandAbsenceRate: null,
      brandFirstMentionRate: null,
    },
    previousHero: null,
  },
};
