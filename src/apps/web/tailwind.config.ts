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
      // Short cross-fade used by the rotating product-awareness messages
      // on the scan-progress screen; keyed remounts trigger the animation.
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 400ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
