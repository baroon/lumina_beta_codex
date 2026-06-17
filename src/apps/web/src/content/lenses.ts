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

export const LENSES_COPY = {
  page: {
    title: "Lenses",
    description:
      "Analyze AI visibility through the six business-intent lenses that shape discovery, buying decisions, comparisons, trust, citations, and content gaps.",
    actions: {
      open: "Open lens",
      export: "Export lens brief",
    },
    controls: {
      countsUnavailable: "Lens counts are unavailable for this range.",
    },
    summary: {
      lenses: "Visibility lenses",
      lensesHelper: "Strategic analysis views used across every tracker.",
      questions: "AI questions",
      questionsHelper: "Tracked prompts evaluated in the selected date range.",
      mentions: "Brand mentions",
      mentionsHelper: "Tracked-brand mentions found in AI answers.",
      citations: "Citations",
      citationsHelper: "Evidence citations captured across AI answers.",
    },
    table: {
      lens: "Lens",
      mentions: "Mentions",
      mentionUnit: "mentions",
      mentionSummary: "{count} lens mentions in this range",
      share: "Share",
      status: "Status",
      action: "Action",
      empty: "No lens evidence yet. Run scans to populate lens performance.",
    },
    status: {
      healthy: "Healthy",
      sparse: "Sparse",
      empty: "No evidence",
    },
  },
  detail: {
    fallbackTitle: "Lens not found",
    fallbackDescription: "Choose a valid Visibility Lens from the lenses overview.",
    actions: {
      back: "All lenses",
      export: "Export lens brief",
    },
    summary: {
      questions: "AI questions",
      questionsHelper: "Tracked prompts evaluated for this lens.",
      mentionRate: "Mention rate",
      mentionRateHelper: "Share of AI answers that mention a tracked brand.",
      firstMention: "First mention",
      firstMentionHelper: "How often a tracked brand is the first named entity.",
      citations: "Citations",
      citationsHelper: "Evidence citations captured for this lens.",
    },
    sections: {
      entities: "Top entities",
      entitiesDescription: "Brands and competitors most visible inside this lens.",
      signals: "Lens signals",
      signalsDescription: "The core measurement signals available for this lens and date range.",
    },
    table: {
      entity: "Entity",
      visibility: "Visibility",
      shareOfVoice: "Share of voice",
      sentiment: "Sentiment",
      type: "Type",
      empty: "No entity evidence yet. Run scans for this lens to populate visibility.",
      youChip: "You",
      unknownSentiment: "Unknown",
      noData: "No data",
    },
    signals: {
      absence: "Absence rate",
      absenceDescription: "Answers where tracked brands are entirely absent.",
      firstMention: "First mention rate",
      firstMentionDescription: "Answers where a tracked brand appears first.",
      trackedBrands: "Tracked brands",
      competitors: "Competitors",
    },
  },
} as const;
