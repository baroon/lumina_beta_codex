import type { Preview } from "@storybook/react";
import "../src/index.css";
import { withRouter } from "./decorators/withRouter";
import { withQueryClient } from "./decorators/withQueryClient";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "page",
      values: [
        { name: "page", value: "var(--color-surface-page, #f8f9fa)" },
        { name: "card", value: "var(--color-surface-card, #ffffff)" },
        { name: "sidebar", value: "var(--color-surface-sidebar, #f1f3f5)" },
        { name: "dark", value: "#1a1a2e" },
      ],
    },
    chromatic: { delay: 500 },
  },
  decorators: [withRouter, withQueryClient],
  tags: ["autodocs"],
};

export default preview;
