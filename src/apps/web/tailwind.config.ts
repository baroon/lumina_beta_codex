import type { Config } from "tailwindcss";

const tokens = require("../../design-tokens/tailwind-tokens.js");

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      ...tokens,
    },
  },
  plugins: [],
};

export default config;
