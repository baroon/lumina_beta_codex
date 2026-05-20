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
      emptyMessage:
        "No trust signals detected. Consider adding reviews, certifications, or case studies.",
    },
  },
  progress: {
    title: "Discovering your brand",
    subtitle:
      "We're analyzing your website to build a complete brand profile. This usually wraps up in under a minute.",
    awaitingConfirmation: "Review and confirm the discovered information.",
    completed: "Discovery complete!",
    failed: "Something went wrong during discovery.",
    stepLabel: "Step",
    ofLabel: "of",
    done: "Done",
    defaultEncouragement: "Working on it...",
  },
  steps: [
    {
      label: "Crawling website",
      encouragement: "Reading your website so we don't have to ask you a hundred questions...",
    },
    {
      label: "Analyzing brand",
      encouragement: "Our AI is studying your brand identity and market positioning...",
    },
    {
      label: "Extracting entities",
      encouragement: "Mapping out your products, audiences, and markets...",
    },
    {
      label: "Suggesting topics",
      encouragement: "Figuring out what people search for when they need a brand like yours...",
    },
    {
      label: "Finding competitors",
      encouragement: "Scouting the competitive landscape to see who you're up against...",
    },
  ],
  complete: {
    title: "Discovery complete",
    description:
      "We've built a complete profile for {brandName}. You're ready to create your Visibility Tracker.",
    createTracker: "Create Visibility Tracker",
    comingSoon: "Tracker setup is coming soon.",
  },
  confirmation: {
    title: "Confirm Discovery: {brandName}",
    descriptionLabel: "Description",
    industryLabel: "Industry",
    categoryLabel: "Category",
    positioningLabel: "Positioning",
    confirming: "Confirming...",
    selectedCount: "{selected}/{total} selected",
  },
  labels: {
    aiSource: "AI",
    manualSource: "Manual",
  },
  confidence: {
    high: "High",
    medium: "Medium",
    low: "Low",
  },
  fallback: {
    noItemsDetected: "No items detected",
    crawlFailedTitle: "Website crawl failed",
    crawlFailedDescription:
      "We couldn't crawl your website, but you can still set up your brand manually.",
    continueManually: "Continue Manually",
  },
  customItem: {
    add: "Add",
    cancel: "Cancel",
    typePlaceholder: "Type",
  },
  productTypes: {
    Product: "Product",
    Service: "Service",
    Feature: "Feature",
    Solution: "Solution",
    Tool: "Tool",
    Resource: "Resource",
  },
  trustSignalTypes: {
    AwardsAndRecognitions: "Awards & Recognitions",
    CertificationsAndAccreditations: "Certifications & Accreditations",
    PressAndMediaMentions: "Press & Media Mentions",
    TestimonialsAndReviews: "Testimonials & Reviews",
    ExpertEndorsements: "Expert Endorsements",
    CaseStudiesAndSuccessMetrics: "Case Studies & Success Metrics",
    ClientAndPartnerLogos: "Client & Partner Logos",
  },
  wizard: {
    steps: [
      { label: "Brand Identity" },
      { label: "Products" },
      { label: "Audiences & Markets" },
      { label: "Competitive Landscape" },
      { label: "Review & Confirm" },
    ],
    next: "Next",
    back: "Back",
    confirmAndFinish: "Confirm & Finish",
    resuggestingMessage: "Improving suggestions based on your selections...",
  },
  review: {
    editSection: "Edit",
    returnToReview: "Return to Review",
    removedUndo: 'Removed "{name}"',
    undoAction: "Undo",
    customTag: "Custom",
    noneSelected: "None selected",
  },
  lenses: {
    title: "Visibility Lenses",
    description: "Each Visibility Lens represents a dimension of your brand's AI visibility.",
  },
  buttons: {
    confirm: "Confirm Selections",
    addCustom: "Add Custom",
    dismiss: "Dismiss",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    refreshLens: "Refresh suggestions",
    refreshLensRemaining: "{count} left",
  },
  errors: {
    loadBrandFailed: "Failed to load brand information.",
    discoveryFailed: "Discovery failed. Please try again or contact support.",
    confirmFailed: "Failed to confirm",
    createBrandFailed: "Failed to create brand",
    regenerateFailed: "Failed to refresh. Original suggestions still available.",
  },
} as const;
