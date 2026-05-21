import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text-summary", "text", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.stories.tsx",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/test-setup.ts",
        "src/test-utils.tsx",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/app/routeTree.gen.ts",
        "src/**/types.ts",
        "src/types/**",
      ],
    },
  },
});
