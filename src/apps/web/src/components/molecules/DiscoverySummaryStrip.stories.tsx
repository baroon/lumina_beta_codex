import type { Meta, StoryObj } from "@storybook/react";
import { DiscoverySummaryStrip } from "./DiscoverySummaryStrip";

const meta: Meta<typeof DiscoverySummaryStrip> = {
  title: "Molecules/DiscoverySummaryStrip",
  component: DiscoverySummaryStrip,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof DiscoverySummaryStrip>;

const sample = (names: string[]) => names.map((n, i) => ({ id: `${n}-${i}`, name: n }));

export const Populated: Story = {
  render: () => (
    <div className="p-8">
      <DiscoverySummaryStrip
        products={sample(["Indeed Premium", "Indeed Free", "Resume Builder"])}
        markets={sample(["United States", "United Kingdom"])}
        audiences={sample(["Job seekers", "Hiring managers", "Recruiters"])}
        topics={sample(["Salary trends", "Remote work", "Career growth", "Interviewing"])}
        trustSignals={sample(["BBB Accredited", "TRUSTe Certified"])}
      />
    </div>
  ),
};

export const SomeEmpty: Story = {
  render: () => (
    <div className="p-8">
      <DiscoverySummaryStrip
        products={sample(["Indeed Premium"])}
        markets={[]}
        audiences={sample(["Job seekers"])}
        topics={[]}
        trustSignals={[]}
      />
    </div>
  ),
};

export const AllEmpty: Story = {
  render: () => (
    <div className="p-8">
      <p className="mb-2 text-xs text-neutral-500">
        Renders nothing — the strip is hidden when the workspace has no discovery rows.
      </p>
      <DiscoverySummaryStrip
        products={[]}
        markets={[]}
        audiences={[]}
        topics={[]}
        trustSignals={[]}
      />
    </div>
  ),
};
