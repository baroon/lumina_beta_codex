/**
 * The 6 Visibility Lenses (ADR-001). Reference seed data on the BE,
 * mirrored here so the overview can render lens-scoped controls without
 * a round-trip just to draw the chips. The single source of truth is
 * `LensConfiguration.cs` on the backend — keep both lists in sync.
 *
 * Lens filtering on the overview currently ships with FE-only state
 * while we A/B the selector form (dropdown vs pill row). The backend
 * filter ride-along will land once the winning form is chosen.
 */
export interface VisibilityLens {
  /** Stable code used as the BE filter param value. */
  code: string;
  /** Display name. */
  name: string;
  /** One-line description for tooltips / sub-text. */
  description: string;
}

export const VISIBILITY_LENSES: ReadonlyArray<VisibilityLens> = [
  {
    code: "Discovery",
    name: "Discovery",
    description: "Does the AI surface the brand when asked about the category or topic?",
  },
  {
    code: "BuyingIntent",
    name: "Buying Intent",
    description: "Is the brand recommended for high-intent, purchase-oriented prompts?",
  },
  {
    code: "CompetitorComparison",
    name: "Competitor Comparison",
    description: "How does the AI compare the brand against its competitors?",
  },
  {
    code: "SentimentAndTrust",
    name: "Sentiment & Trust",
    description: "What sentiment and trust signals does the AI express about the brand?",
  },
  {
    code: "CitationVisibility",
    name: "Citation Visibility",
    description: "Is the brand's own content cited as a source in AI answers?",
  },
  {
    code: "ContentGaps",
    name: "Content Gaps",
    description: "Where is the brand absent from AI answers when it should be present?",
  },
];
