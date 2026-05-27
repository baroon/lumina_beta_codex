import tokens from "../../../../../design-tokens/tokens.json";

type ColorShade = Record<string, string>;

interface ColorTokens {
  primary: ColorShade;
  accent: ColorShade;
  neutral: ColorShade;
  semantic: {
    success: ColorShade;
    warning: ColorShade;
    error: ColorShade;
    info: ColorShade;
  };
}

// tokens.json carries the full design-token tree; we only need the colors
// for chart theming. The cast narrows to the subset we care about and
// surfaces a clear failure at compile time if the source ever drops a
// branch we depend on.
const palette = tokens.color as unknown as ColorTokens;

/**
 * Nivo theme shared across all chart wrappers. Pulls colors and typography
 * from the canonical design tokens (ARCH-003: charts must not use raw hex /
 * arbitrary values — tokens are the single source of truth).
 */
export const nivoTheme = {
  background: "transparent",
  text: {
    fontSize: 12,
    fill: palette.neutral["700"],
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  axis: {
    domain: { line: { stroke: palette.neutral["200"], strokeWidth: 1 } },
    legend: { text: { fontSize: 12, fill: palette.neutral["600"] } },
    ticks: {
      line: { stroke: palette.neutral["200"], strokeWidth: 1 },
      text: { fontSize: 11, fill: palette.neutral["500"] },
    },
  },
  grid: { line: { stroke: palette.neutral["100"], strokeWidth: 1 } },
  legends: { text: { fontSize: 12, fill: palette.neutral["600"] } },
  tooltip: {
    container: {
      background: palette.neutral["900"],
      color: palette.neutral["50"],
      fontSize: 12,
      borderRadius: 4,
      padding: "6px 10px",
    },
  },
} as const;

/** Default series color (primary) for single-series bar charts. */
export const defaultBarColor = palette.primary["500"];

/**
 * Sentiment value → hex mapping. Mirrors the semantic palette so
 * Positive/Negative/Mixed read naturally to the eye. Unknown gets a
 * subdued neutral so it doesn't dominate distributions where most signals
 * are absence.
 */
export const sentimentColors: Record<string, string> = {
  Positive: palette.semantic.success["500"],
  Neutral: palette.neutral["400"],
  Negative: palette.semantic.error["500"],
  Mixed: palette.semantic.warning["500"],
  Unknown: palette.neutral["300"],
};

/** Display ordering for sentiment values in legends + slices. */
export const sentimentOrder = ["Positive", "Neutral", "Mixed", "Negative", "Unknown"] as const;
