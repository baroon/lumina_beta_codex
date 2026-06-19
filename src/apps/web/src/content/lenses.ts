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
    description: "Is the brand recommended for high-intent, purchase-oriented AI questions?",
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
    notice: {
      exported: "Lens brief exported with {count} lenses.",
    },
    controls: {
      countsUnavailable: "Lens counts are unavailable for this range.",
    },
    summary: {
      lenses: "Visibility lenses",
      lensesHelper: "Strategic analysis views used across every tracker.",
      questions: "AI questions",
      questionsHelper: "Tracked AI questions evaluated in the selected date range.",
      mentions: "Brand mentions",
      mentionsHelper: "Tracked-brand mentions found in AI answers.",
      citations: "Citations",
      citationsHelper: "Evidence citations captured across AI answers.",
    },
    table: {
      lens: "Lens",
      primaryMetric: "Primary metric",
      mentions: "Mentions",
      mentionUnit: "mentions",
      mentionSummary: "{count} lens mentions in this range",
      share: "Share",
      status: "Status",
      action: "Action",
      empty: "No lens evidence yet. Run scans to populate lens performance.",
      filteredEmpty: "No lenses match this status filter.",
    },
    attention: {
      title: "Lens attention",
      description: "Lenses that need more evidence or stronger coverage in this range.",
      empty: "All visibility lenses have enough current evidence.",
      priority: "Priority",
      openLens: "Open lens",
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
      recommendations: "View recommendations",
      recommendationsReady: "Recommendations ready",
      export: "Export lens brief",
      clearFilters: "Clear filters",
    },
    notice: {
      exported: "{lens} lens brief exported.",
      recommendations: "Recommendations prepared for {lens}.",
    },
    summary: {
      questions: "AI questions",
      questionsHelper: "Tracked AI questions evaluated for this lens.",
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
    diagnosis: {
      title: "Lens diagnosis",
      priority: "Priority",
      signal: "Signal",
      states: {
        NeedsData: {
          title: "Collect lens evidence",
          description:
            "This lens has no AI questions in the selected range. Run scans or broaden the date range before making coverage decisions.",
        },
        HighAbsence: {
          title: "Reduce brand absence",
          description:
            "Tracked brands are absent from too many AI answers in this lens. Prioritize content and evidence that directly answers these questions.",
        },
        LowMention: {
          title: "Strengthen lens coverage",
          description:
            "The brand is present, but not consistently enough. Improve answer-ready proof points and source coverage for this lens.",
        },
        Healthy: {
          title: "Maintain current coverage",
          description:
            "This lens has enough current evidence and a durable mention rate. Monitor movement and keep proof points fresh.",
        },
      },
    },
    table: {
      entity: "Entity",
      visibility: "Visibility",
      shareOfVoice: "Share of voice",
      sentiment: "Sentiment",
      type: "Type",
      empty: "No entity evidence yet. Run scans for this lens to populate visibility.",
      filteredEmpty: "No entities match these lens filters.",
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
