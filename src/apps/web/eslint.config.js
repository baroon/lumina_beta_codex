import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

// ---------------------------------------------------------------------------
// Feature list — used to generate cross-feature import bans
// ---------------------------------------------------------------------------
const FEATURES = [
  "brands",
  "competitors",
  "content-actions",
  "discovery",
  "findings",
  "prompts",
  "reports",
  "scan-progress",
  "scan-results",
  "sources",
  "topics",
  "trackers",
];

// ---------------------------------------------------------------------------
// Banned path patterns — directories that are not part of the architecture.
// Included in every layer-specific rule group so any file gets the warning.
// ESLint 10 patterns use `group` (array) instead of `name` (string).
// ---------------------------------------------------------------------------
const BANNED_PATH_PATTERNS = [
  {
    group: ["@/components/ui/*"],
    message:
      "@/components/ui/ is not part of the architecture — import from @/components/atoms/ instead.",
  },
  {
    group: ["@/components/layout/*"],
    message:
      "@/components/layout/ is not part of the architecture — import from @/components/organisms/ instead.",
  },
  {
    group: ["@/components/feedback/*"],
    message:
      "@/components/feedback/ is not part of the architecture — import from @/components/atoms/ or @/components/molecules/ instead.",
  },
];

// ---------------------------------------------------------------------------
// Helper: build no-restricted-imports rule value
// ---------------------------------------------------------------------------
function restrictedImports(...extraPatterns) {
  return ["error", { patterns: [...BANNED_PATH_PATTERNS, ...extraPatterns] }];
}

// ---------------------------------------------------------------------------
// Layer boundary configs
// ---------------------------------------------------------------------------

// Rule Group A — Banned path guard (global, for files not matched by more specific rules)
const bannedPathGuard = {
  files: ["**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": restrictedImports(),
  },
};

// Rule Group B — Atom boundary
// Atoms cannot import from molecules, organisms, data-display, charts, features, api, or shared hooks
const atomBoundary = {
  files: ["src/components/atoms/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": restrictedImports(
      {
        group: ["@/components/molecules/*"],
        message: "Atoms must not import from molecules. Atoms are the lowest-level primitives.",
      },
      {
        group: ["@/components/organisms/*"],
        message: "Atoms must not import from organisms.",
      },
      {
        group: ["@/components/data-display/*"],
        message: "Atoms must not import from data-display components.",
      },
      {
        group: ["@/components/charts/*"],
        message: "Atoms must not import from chart components.",
      },
      {
        group: ["@/features/**"],
        message: "Atoms must not import from features. Atoms have no domain knowledge.",
      },
      {
        group: ["@/api/*"],
        message: "Atoms must not import from the API layer. No side effects in atoms.",
      },
      {
        group: ["@/hooks/*"],
        message: "Atoms must not import shared hooks. Atoms are pure UI primitives.",
      },
    ),
  },
};

// Rule Group C — Molecule boundary
// Molecules cannot import from organisms, features, or api
const moleculeBoundary = {
  files: ["src/components/molecules/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": restrictedImports(
      {
        group: ["@/components/organisms/*"],
        message: "Molecules must not import from organisms.",
      },
      {
        group: ["@/features/**"],
        message: "Molecules must not import from features. Molecules have no domain knowledge.",
      },
      {
        group: ["@/api/*"],
        message: "Molecules must not import from the API layer.",
      },
    ),
  },
};

// Rule Group D — Organism boundary
// Organisms cannot import from features or api
const organismBoundary = {
  files: ["src/components/organisms/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": restrictedImports(
      {
        group: ["@/features/**"],
        message: "Organisms must not import from features. Feature content belongs in features/.",
      },
      {
        group: ["@/api/*"],
        message: "Organisms must not import from the API layer.",
      },
    ),
  },
};

// Rule Group E — Shared component boundary (data-display, charts)
// Cannot import from features or api
const sharedComponentBoundary = {
  files: ["src/components/data-display/**/*.{ts,tsx}", "src/components/charts/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": restrictedImports(
      {
        group: ["@/features/**"],
        message: "Shared components must not import from features. Receive data via props.",
      },
      {
        group: ["@/api/*"],
        message: "Shared components must not import from the API layer. Receive data via props.",
      },
    ),
  },
};

// Rule Group F — Cross-feature import ban
// Each feature cannot import from any other feature
const crossFeatureConfigs = FEATURES.map((feature) => {
  const otherFeatures = FEATURES.filter((f) => f !== feature);
  const patterns = otherFeatures.map((other) => ({
    group: [`@/features/${other}/**`],
    message: `Cross-feature import: ${feature} must not import from ${other}. Use shared hooks, types, or URL params instead.`,
  }));

  return {
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": restrictedImports(...patterns),
    },
  };
});

// ---------------------------------------------------------------------------
// Export config
// ---------------------------------------------------------------------------
export default tseslint.config(
  { ignores: ["dist", "storybook-static", "**/*.d.ts", "tailwind.config.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  // Layer boundary rules
  bannedPathGuard,
  atomBoundary,
  moleculeBoundary,
  organismBoundary,
  sharedComponentBoundary,
  ...crossFeatureConfigs,
  // Prettier must be last to disable conflicting formatting rules
  prettier,
);
