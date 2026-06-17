# Lumina Navigation Structure — Implementation Brief

## Objective

Redesign the Lumina left navigation and route structure around the standalone SaaS product architecture below.

The product is not an internal analytics dashboard. It is a standalone AI visibility strategy platform for SEO agencies, digital marketing teams, and client-facing account teams.

The navigation should emphasize:

- Strategy before raw analytics
- Lenses as a first-class product concept
- Recommendations as the action layer
- Evidence and intelligence as drill-down areas
- Brand Discovery as the foundation for tracking
- Reports as a client-facing output

---

## Recommended Navigation Structure

Use this structure as the primary left sidebar navigation.

```text
Dashboard
  Overview

Strategy
  Lenses
    Discovery
    Buying Intent
    Competitive
    Sentiment
    Citations
    Content Gaps
  Recommendations
  Topics

Intelligence
  AI Questions
  Competitors
  Sources
  Claims & Risks

Reporting
  Reports
  Scan History

Setup
  Brand Discovery
  Trackers
  Brands
  Workspace
```

---

## Route Structure

Suggested routes:

```text
/overview

/lenses
/lenses/discovery
/lenses/buying-intent
/lenses/competitive
/lenses/sentiment
/lenses/citations
/lenses/content-gaps

/recommendations
/topics

/ai-questions
/competitors
/sources
/claims-risks

/reports
/scan-history

/brand-discovery
/trackers
/brands
/workspace
```

If the app already uses nested layouts, `Lenses` should be implemented as a parent route with child routes.

---

## Page Purpose Definitions

### Overview

**Purpose:** Executive health check for the selected tracker or workspace.

**Primary question:**

> How visible, trusted, recommended, and cited is my brand right now?

This page should summarize performance, changes, risks, and top actions. It should not become a dump of every chart.

---

### Lenses

**Purpose:** Strategic performance by intent.

**Primary question:**

> How does the brand perform across the moments that matter in AI discovery and decision-making?

Lenses are a core product concept, not simple filters. Each lens should eventually have a focused page with its own summary, metrics, evidence, and recommendations.

Lens child pages:

| Lens | Purpose |
|---|---|
| Discovery | Whether AI platforms mention the brand for broad category, service, and market questions. |
| Buying Intent | Whether AI recommends the brand when users ask for solutions, vendors, or advice. |
| Competitive | Where competitors appear more often, rank higher, or get recommended instead. |
| Sentiment | How AI describes the brand, including perception, positive themes, risks, and sentiment. |
| Citations | Which sources AI uses as evidence and whether owned sources are being cited. |
| Content Gaps | Missing topics, questions, and proof points that content should address. |

---

### Recommendations

**Purpose:** Action workbench.

**Primary question:**

> What should we fix, create, improve, or monitor next?

This is a primary product page. It should feel like the output of the platform, not a secondary insight page.

Rename any existing `Insights` page or route to `Recommendations` where feasible.

---

### Topics

**Purpose:** Topic visibility and content strategy.

**Primary question:**

> Which topics do we own, where are we invisible, and what content opportunities exist?

Topics come from Brand Discovery and should become a major strategy surface for SEO and content teams.

---

### AI Questions

**Purpose:** Evidence and monitoring layer for the questions being tested.

**Primary question:**

> What AI questions are we tracking, and how does the brand perform on each?

This replaces the user-facing label `Prompts`. The underlying code may still use prompt-related domain models, but the UI should say `AI Questions` or `Tracked Questions`.

---

### Competitors

**Purpose:** Competitive intelligence.

**Primary question:**

> Which competitors does AI prefer, and where are they beating us?

This is different from the Competitive lens. The Competitive lens is about competitive-intent questions. The Competitors page is about competitor entities, rankings, gaps, movers, and head-to-head analysis.

---

### Sources

**Purpose:** Citation authority and AI-source influence.

**Primary question:**

> Which websites, domains, and pages influence AI answers about this brand and market?

Keep the nav label as `Sources` because it is simple. Page headings can use richer language such as `Citation Authority`.

---

### Claims & Risks

**Purpose:** Reputation, factual correctness, and verification workflow.

**Primary question:**

> What is AI saying about us that needs verification, correction, or monitoring?

This should include factual claims, disputed claims, risky language, negative sentiment drivers, and verification status.

---

### Reports

**Purpose:** Client and stakeholder communication.

**Primary question:**

> What can I send to a client or stakeholder?

This should become the home for shareable reports, PDF exports, scheduled summaries, and client-ready views.

---

### Scan History

**Purpose:** Operational transparency.

**Primary question:**

> When was data collected, and did monitoring run successfully?

This replaces the current primary `Scans` nav item. It should be lower-priority and live under Reporting or Operations.

---

### Brand Discovery

**Purpose:** Brand intelligence foundation.

**Primary question:**

> What does Lumina know about this brand, market, audience, competitors, products, and trust signals?

This should not disappear after onboarding. It should remain available so users can review and update the brand context that powers lenses and AI questions.

---

### Trackers

**Purpose:** Monitoring setup and configuration.

**Primary question:**

> What monitoring setups exist, and how are they configured?

Trackers define the brand, market, topics, competitors, lenses, platforms, and cadence being monitored.

---

### Brands

**Purpose:** Brand/client management.

**Primary question:**

> Which brands or clients are we managing?

For agency-first positioning, future naming may become `Clients & Brands`, but keep `Brands` for now if that is already implemented.

---

### Workspace

**Purpose:** Workspace settings, team, account-level configuration.

**Primary question:**

> Who has access, and how is this workspace configured?

---

## Sidebar UX Instructions

### 1. Use grouped navigation sections

The sidebar should not be a flat menu. Use clear section labels:

- Dashboard
- Strategy
- Intelligence
- Reporting
- Setup

Section labels should be small uppercase text, muted, with enough spacing above each group.

### 2. Use collapsible groups where useful

`Lenses` should be a collapsible tree item because it has child pages.

Default behavior:

- If the active route is `/lenses` or any `/lenses/*` child route, keep the Lenses tree expanded.
- Otherwise, keep it collapsed by default on smaller screens and expanded on desktop if space allows.

Suggested tree:

```text
▾ Lenses
   Discovery
   Buying Intent
   Competitive
   Sentiment
   Citations
   Content Gaps
```

### 3. Active state behavior

Active page should have:

- Slightly tinted background using the brand accent color at low opacity
- Accent-colored icon and label
- Medium font weight
- Optional left border or small active indicator

Avoid very heavy active backgrounds. This is a data-heavy enterprise SaaS UI, so the active state should be clear but restrained.

### 4. Parent active state

When any lens child route is active:

- `Lenses` parent should also appear active or semi-active.
- The specific child lens should have the strongest active state.

### 5. Sidebar density

Keep the sidebar compact but readable:

- Sidebar width: 240–260px on desktop
- Nav item height: 36–40px
- Icon size: 16–18px
- Label size: 13–14px
- Group label size: 11–12px

### 6. Sidebar collapse behavior

Support collapsed sidebar eventually.

Collapsed behavior:

- Show only icons
- Use tooltips on hover
- Keep active indicator visible
- Lenses child pages can show as flyout or expand temporarily on hover/click

This can be deferred if not currently supported.

---

## Icon Suggestions

Use a consistent outline icon set, preferably Lucide icons if the project already uses it.

Suggested icons:

| Page | Suggested Lucide icon | Rationale |
|---|---|---|
| Overview | `LayoutDashboard` or `Gauge` | Executive summary / dashboard |
| Lenses | `ScanSearch`, `Focus`, or `Radar` | Strategic viewing angle / analysis lens |
| Discovery | `Search` | Discovery and visibility |
| Buying Intent | `ShoppingCart` or `BadgeCheck` | Purchase/recommendation intent |
| Competitive | `Swords` or `GitCompare` | Head-to-head comparison |
| Sentiment | `Heart` or `Smile` | Perception and sentiment |
| Citations | `Quote` or `Link2` | Citations and referenced sources |
| Content Gaps | `CircleAlert` or `FileSearch` | Missing opportunities |
| Recommendations | `Lightbulb` or `ListChecks` | Actionable next steps |
| Topics | `Tags` or `Network` | Topic clusters |
| AI Questions | `MessagesSquare` or `MessageSquareText` | Tracked questions and answers |
| Competitors | `Trophy` or `UsersRound` | Competitive landscape |
| Sources | `Globe` or `BookOpen` | Domains, URLs, citations |
| Claims & Risks | `ShieldAlert` or `TriangleAlert` | Risk and verification |
| Reports | `FileText` or `Presentation` | Client-ready reporting |
| Scan History | `Activity` or `Clock3` | Monitoring run history |
| Brand Discovery | `Sparkles` or `Fingerprint` | AI-assisted brand profile |
| Trackers | `Crosshair` or `Radar` | Monitoring target |
| Brands | `BriefcaseBusiness` or `Building2` | Brands/clients |
| Workspace | `Settings` or `Users` | Account/admin settings |

Icon usage guidelines:

- Use one icon per nav item.
- Do not use filled icons mixed with outline icons.
- Do not overuse purple on every icon; use muted slate/gray by default and accent only for active state.

---

## Top-Level Header / Context Switcher Instructions

Keep the tracker/workspace selector visible near the top of the sidebar or main header.

Recommended hierarchy:

```text
Workspace / Client
Brand
Tracker
```

Current `All trackers (2)` can remain for now, but eventually make it more explicit:

- `All trackers`
- `India Today — India News`
- `Nostri — Canada Architecture`

If users are agencies, consider supporting this future hierarchy:

```text
Client
  Brand
    Tracker
```

---

## Drawer and Drill-Down UX Instructions

Use right-side drawers for evidence and detail views rather than navigating away from the current analytical context.

### Recommended drawers

#### AI Answer History Drawer

Triggered from:

- AI Questions table row
- Overview evidence links
- Lens evidence cards
- Claims & Risks rows
- Recommendations evidence links

Drawer should show:

- AI question
- Summary counts: answers, platforms, mentions, citations
- Answer cards by platform/date
- Mention status
- Sentiment
- First mention position
- Evidence excerpt
- Full answer
- Citations if available

#### Source Detail Drawer

Triggered from Sources table row.

Drawer should show:

- Domain / URL
- Source type
- Source relationship
- Citation count
- Authority score
- Last cited
- AI answers where cited
- Related topics/lenses
- Classification controls

#### Competitor Detail Drawer

Triggered from competitor table row.

Drawer should show:

- Competitor summary
- Mention count
- Share of voice
- Recommendation rate
- Topics won/lost
- Head-to-head metrics against selected brand
- Representative answers

#### Recommendation Detail Drawer

Triggered from recommendation row/card.

Drawer should show:

- Recommended action
- Why it matters
- Impact
- Effort
- Related lens
- Related topics
- Evidence answers
- Suggested content/action brief
- Status controls

### Drawer behavior

- Use a right-side drawer, 420–560px width for normal details.
- For dense evidence like answer history, allow wider drawer: 640–720px.
- Background page should remain visible with a subtle overlay or blur.
- Drawer should be closable with `Esc`, close icon, and clicking outside if safe.
- Preserve page filters and scroll position when drawer closes.

---

## Subpage and Tab Instructions

### Lenses

Implement as nested routes if possible, not just local tabs.

Preferred:

```text
/lenses/discovery
/lenses/buying-intent
/lenses/competitive
/lenses/sentiment
/lenses/citations
/lenses/content-gaps
```

Benefits:

- Shareable URLs
- Better browser navigation
- Easier deep linking from reports and recommendations
- Clear active state in sidebar

### Tables with drill-down

Rows in intelligence pages should generally open drawers, not new pages, unless the detail area becomes too complex.

Use full pages only for major entities later, such as:

```text
/competitors/:entityId
/sources/:sourceId
/topics/:topicId
/recommendations/:recommendationId
```

For v1, drawers are enough.

---

## Naming Changes to Apply in UI

Apply these user-facing naming changes:

| Current | New UI label |
|---|---|
| Prompts | AI Questions |
| Insights | Recommendations |
| Scans | Scan History |
| Comparison lens | Competitive |
| Domain types | Citation source mix |
| Average brand rank | Average answer position |
| Absence rate | Not-mentioned rate |
| Topic ownership | Topic visibility |
| Factual claims to review | Claims AI makes about you |

Code-level naming can remain unchanged temporarily if needed, but UI labels should follow the new product terminology.

---

## Visual Style Guidelines

### Color

Use purple as the Lumina accent, not as the only chart/nav color.

Guidelines:

- Purple: selected brand, active nav, selected lens, primary highlight
- Green: positive, improvement, verified
- Red: negative, risk, decline, disputed
- Amber: warning, mixed, needs review
- Slate/gray: neutral items, inactive icons, competitors by default

Avoid making every bar, pill, icon, and chart purple.

### Typography

Use a clean SaaS type scale:

- Page title: 22–28px, semibold
- Section labels: 11–12px uppercase, medium, muted
- Card titles: 14–16px, semibold
- Table body: 13–14px
- Metadata: 12px, muted but readable

### Spacing

- Keep sidebar compact.
- Use consistent page padding, ideally 24px desktop.
- Use 16–20px spacing between cards.
- Avoid very tall empty cards for sparse data.

### Enterprise feel

The UI should feel calm, trustworthy, and data-heavy without being intimidating.

Avoid:

- Excessive gradients
- Overly playful icons
- Too many pill badges in one row without hierarchy
- Large empty chart containers when sample size is low

---

## Empty and Sparse State Guidelines

Where data is missing or sparse, do not show large empty charts.

Use explicit states:

```text
Not enough data yet
Run at least 2 more scans to unlock trend analysis.
```

or:

```text
Limited sample size
This metric is based on fewer than 5 AI answers in the selected period.
```

Sparse-state handling is especially important for:

- Recommendation rate
- Sentiment trend
- Citation freshness
- Competitive gaps
- New trackers
- Newly added brands

---

## Implementation Notes

1. Build nav config as a typed data structure, not hardcoded JSX.
2. Each nav item should support:
   - label
   - route
   - icon
   - section
   - children
   - badge/count optional
   - beta flag optional
   - disabled/coming soon optional
3. Avoid showing metric counts in sidebar by default. Counts are better in page headers or filters.
4. Lenses can show small status indicators later, but not required in the first implementation.
5. Keep current pages functional while renaming labels and moving routes where possible.
6. Add redirects from old routes:
   - `/prompts` → `/ai-questions`
   - `/insights` → `/recommendations`
   - `/scans` → `/scan-history`
7. Preserve current filters and tracker selector where possible.
8. Do not remove existing pages until replacement routes are working.

---

## Suggested TypeScript Nav Config Shape

```ts
export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string | number;
  isBeta?: boolean;
  isComingSoon?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};
```

Suggested config:

```ts
export const navSections: NavSection[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Overview', href: '/overview', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Strategy',
    items: [
      {
        label: 'Lenses',
        href: '/lenses',
        icon: ScanSearch,
        children: [
          { label: 'Discovery', href: '/lenses/discovery', icon: Search },
          { label: 'Buying Intent', href: '/lenses/buying-intent', icon: ShoppingCart },
          { label: 'Competitive', href: '/lenses/competitive', icon: GitCompare },
          { label: 'Sentiment', href: '/lenses/sentiment', icon: Heart },
          { label: 'Citations', href: '/lenses/citations', icon: Quote },
          { label: 'Content Gaps', href: '/lenses/content-gaps', icon: FileSearch },
        ],
      },
      { label: 'Recommendations', href: '/recommendations', icon: Lightbulb },
      { label: 'Topics', href: '/topics', icon: Tags },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'AI Questions', href: '/ai-questions', icon: MessagesSquare },
      { label: 'Competitors', href: '/competitors', icon: Trophy },
      { label: 'Sources', href: '/sources', icon: Globe },
      { label: 'Claims & Risks', href: '/claims-risks', icon: ShieldAlert },
    ],
  },
  {
    label: 'Reporting',
    items: [
      { label: 'Reports', href: '/reports', icon: FileText },
      { label: 'Scan History', href: '/scan-history', icon: Activity },
    ],
  },
  {
    label: 'Setup',
    items: [
      { label: 'Brand Discovery', href: '/brand-discovery', icon: Sparkles },
      { label: 'Trackers', href: '/trackers', icon: Crosshair },
      { label: 'Brands', href: '/brands', icon: BriefcaseBusiness },
      { label: 'Workspace', href: '/workspace', icon: Settings },
    ],
  },
];
```

---

## Acceptance Criteria

Navigation implementation is acceptable when:

- Sidebar uses the five sections: Dashboard, Strategy, Intelligence, Reporting, Setup.
- `Prompts` no longer appears as a user-facing nav label; it is replaced by `AI Questions`.
- `Insights` no longer appears as a user-facing nav label; it is replaced by `Recommendations`.
- `Scans` no longer appears as a primary analytics nav label; it is replaced by `Scan History` under Reporting.
- `Lenses` is a first-class nav item with six child pages.
- The active state works for both parent and child routes.
- Old routes redirect to new routes.
- The nav remains usable at current sidebar width.
- Icons are consistent and restrained.
- Existing page functionality is preserved while the IA is updated.
