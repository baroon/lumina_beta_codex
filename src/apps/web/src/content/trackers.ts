export const TRACKERS_COPY = {
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
      visibilityChecks: "Visibility Checks",
    },
  },
  created: {
    title: "Visibility Tracker created",
    description: "{name} is ready. Prompt setup is coming next.",
  },
  review: {
    title: "Review your prompts",
    description:
      "These prompts will run across AI platforms. Remove any that don't fit, regenerate, or confirm to continue.",
    generating: "Generating your prompts...",
    allocation: "{count} / {allocation} prompts",
    regenerate: "Regenerate all",
    confirm: "Confirm prompts",
    confirming: "Confirming...",
    empty: "No prompts yet.",
    generate: "Generate prompts",
    custom: "Custom",
    confirmedTitle: "Prompts confirmed",
    confirmedDescription:
      "{count} prompts are active. Platform & cadence selection is coming next.",
  },
} as const;
