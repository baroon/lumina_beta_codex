import type { Meta, StoryObj } from "@storybook/react";
import type { ScanStatus } from "@/types/api";
import { ScanProgressPanel } from "./ScanProgressPanel";

const scanStatus: ScanStatus = {
  scanRunId: "s2",
  status: "Running",
  triggerType: "Manual",
  scanCheckCount: 24,
  completedCount: 10,
  failedCount: 2,
  startedAt: "2026-06-09T09:00:00Z",
  completedAt: null,
  brandName: "Acme",
  platforms: [
    {
      platformId: "p1",
      code: "openai",
      name: "ChatGPT",
      completed: 8,
      failed: 0,
      total: 12,
      status: "Running",
    },
    {
      platformId: "p2",
      code: "perplexity",
      name: "Perplexity",
      completed: 2,
      failed: 2,
      total: 12,
      status: "Failed",
    },
  ],
  liveCounters: {
    mentions: 6,
    citations: 4,
    recommended: 3,
    sentiment: {
      positive: 2,
      neutral: 3,
      negative: 1,
      mixed: 0,
      unknown: 0,
    },
  },
};

const meta: Meta<typeof ScanProgressPanel> = {
  title: "Features/Trackers/ScanProgressPanel",
  component: ScanProgressPanel,
  tags: ["autodocs"],
  args: {
    scan: scanStatus,
    isStarting: false,
    isError: false,
  },
};

export default meta;
type Story = StoryObj<typeof ScanProgressPanel>;

export const Running: Story = {};

export const Starting: Story = {
  args: {
    scan: undefined,
    isStarting: true,
  },
};

export const Error: Story = {
  args: {
    scan: undefined,
    isStarting: false,
    isError: true,
  },
};
