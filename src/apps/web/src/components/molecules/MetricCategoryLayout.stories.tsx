import type { Meta, StoryObj } from "@storybook/react";
import { Eye, ThumbsUp, Heart, Swords, Quote } from "lucide-react";
import { MetricCategoryLayout } from "./MetricCategoryLayout";

const meta: Meta<typeof MetricCategoryLayout> = {
  title: "Molecules/MetricCategoryLayout",
  component: MetricCategoryLayout,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof MetricCategoryLayout>;

function PlaceholderBlock({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500">
      {label}
    </div>
  );
}

const SECTIONS = [
  {
    id: "visibility",
    label: "Visibility",
    icon: Eye,
    children: <PlaceholderBlock label="Visibility metrics + per-platform/lens/topic breakdowns" />,
  },
  {
    id: "recommendation",
    label: "Recommendation",
    icon: ThumbsUp,
    children: <PlaceholderBlock label="Recommendation rate, score, share, top-pick share" />,
  },
  {
    id: "sentiment",
    label: "Sentiment & Trust",
    icon: Heart,
    children: <PlaceholderBlock label="Sentiment distribution, brand attributes, risk flags" />,
  },
  {
    id: "competitive",
    label: "Competitive",
    icon: Swords,
    children: <PlaceholderBlock label="Share of voice, per-competitor breakdown, head-to-head" />,
  },
  {
    id: "citations",
    label: "Citations & Sources",
    icon: Quote,
    children: <PlaceholderBlock label="Citation counts, classifications, top sources" />,
  },
];

export const Default: Story = {
  render: () => (
    <div className="p-6">
      <MetricCategoryLayout sections={SECTIONS} />
    </div>
  ),
};

export const WithStatusAndControls: Story = {
  render: () => (
    <div className="p-6">
      <MetricCategoryLayout
        statusStrip={
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
            Scan #abc123 · Completed · 6 answers across 1 platform
          </div>
        }
        controlsStrip={
          <div className="rounded-lg border border-neutral-200 p-3 text-sm text-neutral-600">
            [date range picker] [filters]
          </div>
        }
        sections={SECTIONS}
      />
    </div>
  ),
};
