export const TRACKERS_COPY = {
  list: {
    title: "Trackers",
    description:
      "Manage monitoring setups that define which brand, market, topics, competitors, lenses, platforms, and cadence Lumina should track.",
    actions: {
      newBrand: "Add brand",
    },
    summary: {
      total: "Total trackers",
      totalHelper: "Monitoring setups across every brand in this workspace.",
      active: "Active trackers",
      activeHelper: "Trackers currently expected to produce scans.",
      brands: "Brands monitored",
      brandsHelper: "Brands with at least one configured tracker.",
      scans: "Completed scans",
      scansHelper: "All completed scan runs recorded for these trackers.",
    },
    sections: {
      brandHealth: "Brand coverage",
      brandHealthDescription: "See which brands have active monitoring and recent scan history.",
      trackerTable: "Tracker inventory",
      trackerTableDescription:
        "Open a tracker to review AI questions, schedule, lenses, scans, and results.",
    },
    table: {
      tracker: "Tracker",
      brand: "Brand",
      status: "Status",
      scans: "Scans",
      latestScan: "Latest scan",
      action: "Action",
      open: "Open",
      neverScanned: "Never scanned",
    },
    empty:
      "No trackers yet. Add a brand, run discovery, and create a tracker to start monitoring AI visibility.",
    error: "Failed to load trackers.",
  },
  ready: {
    title: "Ready to create your Visibility Tracker",
    description:
      "We'll monitor how AI platforms talk about {brandName} using your confirmed discovery.",
    nameLabel: "Tracker name",
    coverageTitle: "What this tracker will monitor",
    create: "Create Visibility Tracker",
    creating: "Creating...",
    summary: {
      topics: "Topics",
      competitors: "Competitors",
      products: "Products & Services",
      audiences: "Audiences",
      markets: "Markets",
      lenses: "Visibility Lenses",
    },
  },
  created: {
    title: "Visibility Tracker created",
    description: "{name} is ready. AI question setup is coming next.",
  },
  generationProgress: {
    // First-generation progress screen (PromptGenerationProgress). Plays
    // while the initial AI Question set is crafted after the user activates
    // tracker setup.
    title: "Crafting AI Questions for {brand}…",
    titleFallback: "Crafting your AI Questions…",
    subtext: "We're translating your discovery into the questions buyers actually ask AI.",
    // Awareness messages that cycle in the bottom card. Same shape as the
    // scan-progress rotation; copy is AI Question-specific.
    awarenessMessages: [
      "AI Questions mirror what real buyers ask AI. We craft them across 6 lenses so you see every angle of how AI talks about you.",
      "Your AI Questions are tailored from what you confirmed in discovery — products, audiences, markets, competitors.",
      "Good AI Questions spell the difference between a generic snapshot and one that mirrors your buyer's journey.",
      "Each Visibility Lens needs its own question style — Discovery, Buying Intent, Comparison, Trust, Citations, and Gaps.",
      "Most AI Questions here are generated from your brand context; you can edit, add your own, or regenerate any single lens after you review.",
      "The thorough discovery you just did means every future scan asks better questions. The work is already paying off.",
    ] as readonly string[],
  },
  review: {
    title: "Review your AI Questions",
    description:
      "These AI Questions will run across AI platforms. Remove any that don't fit, regenerate, or confirm to continue.",
    generating: "Generating your AI Questions...",
    allocation: "{count} / {allocation} AI Questions",
    regenerate: "Regenerate all",
    regenerateCheck: "Regenerate {check}",
    collapse: "Collapse {check}",
    expand: "Expand {check}",
    sourceAi: "AI-generated",
    sourceHuman: "Added by you",
    editPlaceholder: "Edit AI Question",
    needsReview: "Review",
    confidenceHigh: "High",
    checkDescriptions: {
      Discovery: "Does AI surface your brand for category and topic questions?",
      "Buying Intent": "Is your brand recommended for purchase-ready AI Questions?",
      "Competitor Comparison": "How AI weighs your brand against competitors.",
      "Sentiment & Trust": "The sentiment and trust AI expresses about your brand.",
      "Citation Visibility": "Is your content cited as a source in AI answers?",
      "Content Gaps": "Where your brand is missing but should appear.",
    },
    confirm: "Confirm AI Questions",
    confirming: "Confirming...",
    empty: "No AI Questions yet.",
    generate: "Generate AI Questions",
    custom: "Custom",
    addCustom: "Add custom AI Question",
    addPlaceholder: "Type an AI Question...",
    checkPlaceholder: "Visibility lens",
    topicPlaceholder: "Topic (optional)",
    add: "Add",
    cancel: "Cancel",
    regeneratePlaceholder: "Regenerate...",
    scopeAll: "All AI Questions",
    byCheckLabel: "Lens",
    byTopicLabel: "Topic",
    remaining: "{remaining} left",
    full: "Tracker is full — remove an AI Question to add another.",
    confirmedTitle: "AI Questions confirmed",
    confirmedDescription:
      "{count} AI Questions are active. Platform & cadence selection is coming next.",
  },
  schedule: {
    title: "Set up scanning",
    description: "Choose which AI platforms to scan {brandName} on, and how often.",
    platformsLabel: "AI platforms",
    cadenceLabel: "Cadence",
    timezoneLabel: "Time zone",
    platformNeedsKey: "Needs API key",
    cadence: {
      OnDemand: "On demand",
      Daily: "Daily",
      Weekly: "Weekly",
    },
    estimate: "{prompts} AI Questions × {platforms} platforms = {checks} scan checks",
    noPlatforms: "Select at least one platform.",
    activate: "Activate tracker",
    activating: "Activating...",
    activatedTitle: "Tracker is active",
    activatedDescription: "{checks} scan checks, {cadence} cadence.",
  },
  scan: {
    // Live progress screen (post-activation, while the scan runs).
    progressTitleTemplate: "Checking {platforms} for {brand}…",
    progressTitleFallback: "Checking AI platforms for {brand}…",
    progressSubtext: "{done}/{total} complete",
    platformStatus: {
      Pending: "Pending",
      Running: "Running",
      Done: "Done",
      Failed: "Failed",
    } as Record<string, string>,
    liveResultsTitle: "Live results",
    mentions: "Mentions",
    citations: "Citations",
    recommended: "Recommended",
    sentiment: "Sentiment",
    // Product-awareness messages that cycle every ~6s in place of the
    // old McKinsey pull-quote. Order is the rotation order; keep them
    // self-contained sentences so the rotation reads naturally.
    awarenessMessages: [
      "Visibility Lenses look at your brand through 6 angles — Discovery, Buying Intent, Competitor Comparison, Sentiment & Trust, Citation Visibility, and Content Gaps.",
      "A Tracker is a long-lived view of how AI platforms talk about your brand. Every scan adds another snapshot to the trend.",
      "The thorough discovery you just did means every future scan asks better questions. The work is already paying off.",
      "We analyze every answer the way a careful reviewer would — sentence by sentence, source by source — just faster.",
      "Trends move the needle. One scan tells you where you stand; the next tells you whether you're getting better.",
      "Citations show you which sources AI reaches for in your category — and whether your own content is in the mix.",
    ] as readonly string[],
    // Complete screen (terminal state after Completed / Failed).
    completeTitle: "Your first scan is complete!",
    completeSubtitle:
      "We've analyzed how AI platforms talk about {brand} across {queries} queries.",
    completeSubtitleFallback:
      "We've analyzed how AI platforms talk about your brand across {queries} queries.",
    whatWeFoundTitle: "What we found",
    completeBody:
      "This is just the beginning. Your scan results have detailed insights, trends, and recommendations.",
    viewScanResults: "View scan results",
    sentimentLabels: {
      Positive: "Positive",
      Neutral: "Neutral",
      Negative: "Negative",
      Mixed: "Mixed",
      Unknown: "Pending",
    } as Record<string, string>,
  },
} as const;
