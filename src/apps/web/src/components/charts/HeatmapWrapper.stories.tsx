import type { Meta, StoryObj } from "@storybook/react";
import { HeatmapWrapper } from "./HeatmapWrapper";

const meta: Meta<typeof HeatmapWrapper> = {
  title: "Charts/HeatmapWrapper",
  component: HeatmapWrapper,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof HeatmapWrapper>;

export const ActivityHeatmap: Story = {
  args: {
    data: {
      rows: ["ChatGPT", "Gemini", "Claude"],
      cols: ["May 1", "May 8", "May 15", "May 22", "May 29"],
      cells: [
        { row: "ChatGPT", col: "May 1", value: 4 },
        { row: "ChatGPT", col: "May 8", value: 6 },
        { row: "ChatGPT", col: "May 15", value: 3 },
        { row: "ChatGPT", col: "May 22", value: 8 },
        { row: "ChatGPT", col: "May 29", value: 5 },
        { row: "Gemini", col: "May 1", value: 1 },
        { row: "Gemini", col: "May 15", value: 2 },
        { row: "Gemini", col: "May 29", value: 3 },
        { row: "Claude", col: "May 8", value: 2 },
        { row: "Claude", col: "May 22", value: 4 },
      ],
    },
  },
};

export const TopicHeatmap: Story = {
  args: {
    data: {
      rows: ["Architecture", "Interior Design", "Urban Planning", "Sustainability"],
      cols: ["ChatGPT", "Gemini", "Claude"],
      cells: [
        { row: "Architecture", col: "ChatGPT", value: 12 },
        { row: "Architecture", col: "Gemini", value: 8 },
        { row: "Architecture", col: "Claude", value: 4 },
        { row: "Interior Design", col: "ChatGPT", value: 7 },
        { row: "Interior Design", col: "Gemini", value: 5 },
        { row: "Urban Planning", col: "ChatGPT", value: 3 },
        { row: "Sustainability", col: "ChatGPT", value: 1 },
      ],
    },
  },
};

export const Empty: Story = {
  args: { data: { rows: [], cols: [], cells: [] } },
};
