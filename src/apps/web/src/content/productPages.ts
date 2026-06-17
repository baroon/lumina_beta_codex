import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpenText,
  BriefcaseBusiness,
  CircleAlert,
  Compass,
  FileSearch,
  FileText,
  GitCompare,
  Globe,
  Heart,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  Quote,
  Radar,
  ScanSearch,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Tags,
  Trophy,
} from "lucide-react";

export interface ProductPageMetric {
  label: string;
  value: string;
  helper: string;
}

export interface ProductPageSection {
  title: string;
  description: string;
  items: readonly string[];
}

export interface ProductPageConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  primaryQuestion: string;
  metrics: readonly ProductPageMetric[];
  sections: readonly ProductPageSection[];
  emptyState: string;
}

const defaultMetrics = [
  {
    label: "Sample size",
    value: "Not enough data yet",
    helper: "Rates will include the number of AI answers used once scans are available.",
  },
  {
    label: "Evidence",
    value: "Drawer-ready",
    helper: "Rows and metrics are designed to open answer, citation, entity, or claim evidence.",
  },
  {
    label: "Status",
    value: "Product shell",
    helper: "This page is wired into navigation while the full data model lands.",
  },
] as const;

export const PRODUCT_PAGES = {
  lenses: {
    title: "Lenses",
    description:
      "Analyze AI visibility through strategic marketing lenses: discovery, buying decisions, competitive comparisons, sentiment, citations, and content gaps.",
    icon: ScanSearch,
    primaryQuestion: "How does the brand perform across the moments that matter?",
    metrics: defaultMetrics,
    sections: [
      {
        title: "Lens overview",
        description: "Compare performance across the six business-intent lenses.",
        items: [
          "Discovery",
          "Buying Intent",
          "Competitive",
          "Sentiment",
          "Citations",
          "Content Gaps",
        ],
      },
      {
        title: "Recommended analysis",
        description: "Each lens should summarize metrics, evidence, and actions for that intent.",
        items: ["Health status", "Primary metric", "Key issue or win", "Open recommendations"],
      },
    ],
    emptyState: "Run scans for at least one tracker to populate lens performance.",
  },
  discoveryLens: lensPage(
    "Discovery",
    Search,
    "Whether AI platforms mention the brand for broad category, service, and market questions.",
    "Are AI platforms finding and mentioning the brand for broad category questions?",
  ),
  buyingIntentLens: lensPage(
    "Buying Intent",
    ShoppingCart,
    "Whether AI recommends the brand when users ask for solutions, vendors, or advice.",
    "Is the brand recommended when buyers ask what to choose?",
  ),
  competitiveLens: lensPage(
    "Competitive",
    GitCompare,
    "Where competitors appear more often, rank higher, or get recommended instead.",
    "Which competitors are beating the brand in competitive-intent answers?",
  ),
  sentimentLens: lensPage(
    "Sentiment",
    Heart,
    "How AI describes the brand, including perception, positive themes, risks, and sentiment.",
    "How does AI describe the brand, and what perception risks need attention?",
  ),
  citationsLens: lensPage(
    "Citations",
    Quote,
    "Which sources AI uses as evidence and whether owned sources are being cited.",
    "Which sources influence AI answers, and are owned sources being cited?",
  ),
  contentGapsLens: lensPage(
    "Content Gaps",
    FileSearch,
    "Missing topics, questions, and proof points that content should address.",
    "Which topics and proof points should the content team cover better?",
  ),
  recommendations: {
    title: "Recommendations",
    description:
      "Prioritized actions to improve AI visibility, citation authority, competitive positioning, and brand accuracy.",
    icon: Lightbulb,
    primaryQuestion: "What should we fix, create, improve, or monitor next?",
    metrics: defaultMetrics,
    sections: [
      {
        title: "Action workbench",
        description:
          "Recommendations should include evidence, impact, effort, lens, status, and CTA.",
        items: [
          "Improve citation authority",
          "Close topic gaps",
          "Review risky claims",
          "Create content briefs",
        ],
      },
      {
        title: "Details drawer",
        description:
          "Each action opens a right-side drawer with why it matters and supporting evidence.",
        items: ["Why this matters", "Evidence", "Suggested implementation", "Status controls"],
      },
    ],
    emptyState:
      "No recommendations yet. Recommendations appear after enough answer, citation, competitor, and topic evidence is collected.",
  },
  topics: {
    title: "Topics",
    description:
      "Review topic visibility, weak areas, and content opportunities from Brand Discovery.",
    icon: Tags,
    primaryQuestion:
      "Which topics do we own, where are we invisible, and what should content cover?",
    metrics: defaultMetrics,
    sections: [
      {
        title: "Topic visibility",
        description:
          "Rank topics by visibility, recommendation rate, share of voice, and content gaps.",
        items: ["Topic", "Lens", "Visibility", "Competitor strength", "Recommended action"],
      },
      {
        title: "Content opportunities",
        description: "Translate weak topic evidence into SEO and content actions.",
        items: ["Questions to answer", "Proof points to add", "Sources to earn", "Pages to update"],
      },
    ],
    emptyState:
      "No topics found yet. Complete Brand Discovery to identify strategic topics for this brand.",
  },
  claimsRisks: {
    title: "Claims & Risks",
    description:
      "Review factual claims, disputed statements, risky descriptions, and negative themes AI platforms generate about your brand.",
    icon: ShieldAlert,
    primaryQuestion:
      "What is AI saying about us that needs verification, correction, or monitoring?",
    metrics: [
      { label: "Open Risks", value: "0", helper: "Unresolved risk items that need review." },
      { label: "Claims to Review", value: "0", helper: "Factual claims not yet reviewed." },
      { label: "High Severity", value: "0", helper: "Recurring or high-impact risks." },
    ],
    sections: [
      {
        title: "Claims AI makes about you",
        description:
          "Similar claims should be grouped so repeated statements can be reviewed once.",
        items: ["Claim", "Occurrences", "Platforms", "Status", "Severity", "Recommended action"],
      },
      {
        title: "Risk themes",
        description:
          "Recurring negative, uncertain, disputed, or sensitive themes detected in answers.",
        items: [
          "Outdated information",
          "Factual dispute",
          "Brand confusion",
          "Missing trust signal",
        ],
      },
    ],
    emptyState:
      "No claims or risks detected yet. Claims appear after Lumina analyzes enough AI answers.",
  },
  reports: {
    title: "Reports",
    description:
      "Create, schedule, and share client-ready summaries of AI visibility, competitive movement, citation authority, risks, and recommended actions.",
    icon: FileText,
    primaryQuestion: "What can I send to a client or stakeholder?",
    metrics: defaultMetrics,
    sections: [
      {
        title: "Create report",
        description: "Build a client-ready report from metrics, recommendations, and evidence.",
        items: [
          "Executive summary",
          "Visibility scorecards",
          "Recommendations",
          "Evidence appendix",
        ],
      },
      {
        title: "Report templates",
        description: "Choose a format based on audience and use case.",
        items: [
          "Weekly client update",
          "Monthly AI visibility report",
          "Competitive movement report",
        ],
      },
    ],
    emptyState:
      "No reports created yet. Create your first report from current tracker insights and evidence.",
  },
  brandDiscovery: {
    title: "Brand Discovery",
    description:
      "Review and refine the brand, market, audience, competitors, topics, products, services, and trust signals Lumina uses to generate relevant AI questions.",
    icon: Compass,
    primaryQuestion: "What does Lumina know about this brand?",
    metrics: defaultMetrics,
    sections: [
      {
        title: "Brand intelligence profile",
        description:
          "The strategic context Lumina uses to create AI questions and analyze visibility.",
        items: ["Brand profile", "Products & services", "Audiences", "Markets", "Topics"],
      },
      {
        title: "Website scan evidence",
        description: "Pages Lumina scanned to understand the brand and generate recommendations.",
        items: ["URL", "Page type", "Status", "Extracted signals", "Last scanned"],
      },
    ],
    emptyState:
      "Start Brand Discovery by entering a brand website. Lumina will scan key pages and suggest the brand context.",
  },
  trackers: {
    title: "Trackers",
    description:
      "Manage monitoring setups that define which brand, market, topics, competitors, lenses, platforms, and cadence Lumina should track.",
    icon: Radar,
    primaryQuestion: "What monitoring setups exist, and how are they configured?",
    metrics: defaultMetrics,
    sections: [
      {
        title: "Trackers table",
        description: "Each tracker defines monitoring scope and scan cadence.",
        items: ["Tracker name", "Brand", "Market", "Lenses", "Platforms", "Cadence", "Status"],
      },
      {
        title: "Tracker details",
        description: "Open configuration details for lens, topic, platform, and reporting setup.",
        items: ["Basic details", "AI platforms", "Cadence", "Report settings"],
      },
    ],
    emptyState: "No trackers yet. Create a tracker to start monitoring AI visibility.",
  },
  workspace: {
    title: "Workspace",
    description:
      "Manage team access, workspace settings, billing limits, report defaults, and account-level preferences.",
    icon: Settings,
    primaryQuestion: "Who has access, and how is this workspace configured?",
    metrics: defaultMetrics,
    sections: [
      {
        title: "Workspace profile",
        description: "Account-level defaults for locale, timezone, ownership, and reporting.",
        items: ["Workspace name", "Default timezone", "Primary contact", "Report defaults"],
      },
      {
        title: "Team and limits",
        description: "Manage roles, notifications, integrations, and plan limits.",
        items: ["Team members", "Notifications", "Plan limits", "Integrations"],
      },
    ],
    emptyState: "Workspace settings are available after the workspace is created.",
  },
} as const satisfies Record<string, ProductPageConfig>;

function lensPage(
  title: string,
  icon: LucideIcon,
  description: string,
  primaryQuestion: string,
): ProductPageConfig {
  return {
    title,
    description,
    icon,
    primaryQuestion,
    metrics: defaultMetrics,
    sections: [
      {
        title: `${title} health`,
        description: "Track the core metrics for this strategic lens.",
        items: ["Brand Mention Rate", "Recommendation Rate", "Answer Position", "Open Risks"],
      },
      {
        title: "Evidence and actions",
        description:
          "Open supporting AI answers, citations, entities, claims, and recommendations.",
        items: ["Answer evidence", "Top questions", "Related sources", "Recommended actions"],
      },
    ],
    emptyState: `No ${title.toLowerCase()} evidence yet. Run scans to populate this lens.`,
  };
}

export const PRODUCT_PAGE_ICON_SET = {
  Activity,
  BookOpenText,
  BriefcaseBusiness,
  CircleAlert,
  Globe,
  ListChecks,
  MessagesSquare,
  Trophy,
} as const;
