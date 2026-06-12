import type { Meta, StoryObj } from "@storybook/react";
import { EntityTrendDrillDown } from "./EntityTrendDrillDown";

const meta: Meta<typeof EntityTrendDrillDown> = {
  title: "Molecules/EntityTrendDrillDown",
  component: EntityTrendDrillDown,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EntityTrendDrillDown>;

export const WithTrend: Story = {
  args: {
    name: "Acme",
    trend: {
      entityType: "Brand",
      entityId: "b1",
      entityName: "Acme",
      metricName: "BrandMentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.32, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-08T00:00:00Z", value: 0.41, category: null },
        { scanRunId: "s3", capturedAt: "2026-05-15T00:00:00Z", value: 0.55, category: null },
        { scanRunId: "s4", capturedAt: "2026-05-22T00:00:00Z", value: 0.5, category: null },
      ],
    },
  },
};

export const NoTrend: Story = {
  args: {
    name: "Acme",
    trend: undefined,
  },
};

export const AllNullPoints: Story = {
  args: {
    name: "Acme",
    trend: {
      entityType: "Brand",
      entityId: "b1",
      entityName: "Acme",
      metricName: "BrandMentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: null, category: null },
      ],
    },
  },
};
