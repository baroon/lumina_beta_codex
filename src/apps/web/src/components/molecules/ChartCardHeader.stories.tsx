import type { Meta, StoryObj } from "@storybook/react";
import { TrendingUp, PieChart, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/atoms/card";
import { ChartCardHeader } from "./ChartCardHeader";

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md p-8">
      <Card>
        {children}
        <CardContent className="pt-0">
          <div className="h-40 rounded bg-neutral-50" />
        </CardContent>
      </Card>
    </div>
  );
}

const meta: Meta<typeof ChartCardHeader> = {
  title: "Molecules/ChartCardHeader",
  component: ChartCardHeader,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ChartCardHeader>;

export const Default: Story = {
  render: () => (
    <Wrap>
      <ChartCardHeader icon={TrendingUp} title="Visibility" />
    </Wrap>
  ),
};

export const WithSubtitle: Story = {
  render: () => (
    <Wrap>
      <ChartCardHeader
        icon={PieChart}
        title="Share of voice"
        subtitle="Among selected entities, this window"
      />
    </Wrap>
  ),
};

export const WithTooltip: Story = {
  render: () => (
    <Wrap>
      <ChartCardHeader
        icon={Globe}
        title="Top citation domains"
        tooltip="Which third-party sites the AI models cite most often when answering your prompts."
      />
    </Wrap>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Wrap>
      <ChartCardHeader
        icon={TrendingUp}
        title="Visibility"
        tooltip="Trend of brand mention rate over time."
        actions={
          <button className="text-xs font-medium text-primary-600 hover:underline" type="button">
            View all →
          </button>
        }
      />
    </Wrap>
  ),
};
