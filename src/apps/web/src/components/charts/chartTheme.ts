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

/** Default series color (primary) for single-series bar / line charts. */
export const defaultBarColor = palette.primary["500"];

/**
 * Sentiment value → hex mapping. Mirrors the semantic palette so
 * Positive/Negative/Mixed read naturally to the eye. Unknown gets a
 * subdued neutral so it doesn't dominate distributions where most
 * signals are absence.
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
