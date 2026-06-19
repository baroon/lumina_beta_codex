import type { Meta, StoryObj } from "@storybook/react";
import { Activity, Calendar, MessageSquare, Settings, Sliders } from "lucide-react";
import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "Molecules/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[720px] p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    tabs: [
      { id: "overview", label: "Overview", children: <p>Overview content</p> },
      { id: "schedule", label: "Schedule", children: <p>Schedule content</p> },
      { id: "prompts", label: "AI Questions", children: <p>AI Questions content</p> },
    ],
  },
};

export const WithIcons: Story = {
  args: {
    tabs: [
      {
        id: "overview",
        label: "Overview",
        icon: Activity,
        children: <p className="text-sm text-neutral-700">Per-tracker dashboard.</p>,
      },
      {
        id: "schedule",
        label: "Schedule",
        icon: Calendar,
        children: <p className="text-sm text-neutral-700">Cadence + platforms.</p>,
      },
      {
        id: "prompts",
        label: "AI Questions",
        icon: MessageSquare,
        children: (
          <p className="text-sm text-neutral-700">AI question set, scoped to this tracker.</p>
        ),
      },
      {
        id: "lenses",
        label: "Lenses",
        icon: Sliders,
        children: <p className="text-sm text-neutral-700">Visibility Lens selection.</p>,
      },
      {
        id: "scans",
        label: "Scans",
        icon: Settings,
        children: <p className="text-sm text-neutral-700">Scan run history.</p>,
      },
    ],
  },
};

export const DefaultTabOverride: Story = {
  args: {
    defaultTab: "schedule",
    tabs: [
      { id: "overview", label: "Overview", children: <p>Overview</p> },
      { id: "schedule", label: "Schedule", children: <p>Schedule (default)</p> },
      { id: "prompts", label: "AI Questions", children: <p>AI Questions</p> },
    ],
  },
};

export const CustomParamName: Story = {
  args: {
    paramName: "section",
    tabs: [
      { id: "config", label: "Config", children: <p>?section=config</p> },
      { id: "history", label: "History", children: <p>?section=history</p> },
    ],
  },
};
