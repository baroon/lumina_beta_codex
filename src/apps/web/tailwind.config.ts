import type { Config } from "tailwindcss";

const tokens = require("../../design-tokens/tailwind-tokens.js");

const config: Config = {
  // Tremor v3 ships pre-styled components — its class names need to be
  // visible to Tailwind so they get included in the build.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      ...tokens,
    },
  },
  plugins: [],
};

export default config;
