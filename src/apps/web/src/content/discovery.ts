export const DISCOVERY_COPY = {
  sections: {
    brandProfile: {
      title: "Brand Profile",
      description: "We detected the following brand information from your website.",
      emptyMessage: "We couldn't detect your brand profile. Please add it manually.",
    },
    products: {
      title: "Products & Services",
      description: "These products and services were found on your website.",
      emptyMessage: "No products detected. Add your key products and services below.",
    },
    audiences: {
      title: "Target Audiences",
      description: "Potential target audiences identified from your content.",
      emptyMessage: "No audiences detected. Who are your target customers?",
    },
    markets: {
      title: "Markets",
      description: "Geographic markets detected from your website.",
      emptyMessage: "No markets detected. Where do you operate?",
    },
    topics: {
      title: "Topics",
      description: "Key topics and themes found in your content.",
      emptyMessage: "No topics detected. What topics are important to your brand?",
    },
    competitors: {
      title: "Competitors",
      description: "Competitors identified through AI analysis and website content.",
      emptyMessage: "No competitors found. Add your key competitors below.",
    },
    trustSignals: {
      title: "Trust Signals",
      description: "Trust-building elements found on your website.",
      emptyMessage: "No trust signals detected. Consider adding reviews, certifications, or case studies.",
    },
  },
  progress: {
    title: "Discovering your brand",
    awaitingConfirmation: "Review and confirm the discovered information.",
    completed: "Discovery complete!",
    failed: "Something went wrong during discovery.",
  },
  buttons: {
    confirm: "Confirm Selections",
    addCustom: "Add Custom",
    dismiss: "Dismiss",
    selectAll: "Select All",
    deselectAll: "Deselect All",
  },
} as const;
