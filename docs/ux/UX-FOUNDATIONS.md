# UX Foundations — Lumina AI Visibility Platform

> **Version:** 1.0.0
> **Status:** Active
> **Audience:** Developers, designers, AI agents
> **Dependencies:** `design-tokens/tokens.json`, `design-tokens/TOKENS.md`, `agent-system/component-manifest.json`

## Overview

This document defines the visual language, layout system, page templates, interaction patterns, responsive strategy, and accessibility standards for the Lumina platform. Every screen built must follow these foundations.

**Visual direction:** Linear's structural discipline (clean cards, tables, status systems, sidebar nav) combined with Arc's warmth and personality (subtle gradients, rounded corners, distinctive color).

**Locked decisions:**

| Decision | Value |
|----------|-------|
| Primary color | Violet `#7C3AED` (`--color-primary-600`) |
| Layout | Collapsible sidebar + top bar |
| Theme | Light only (v1) |
| Font | Inter |
| Icons | Lucide (bundled with shadcn/ui) |
| Components | shadcn/ui + CVA variants |
| Charts | Nivo via wrapper components |

---

## A. Visual Language

### A.1 Color Usage Rules

Colors communicate meaning. Use them consistently.

| Purpose | Token(s) | When to Use |
|---------|----------|-------------|
| Brand / CTAs | `--color-primary-600` | Primary buttons, active sidebar items, focus rings, key brand moments |
| Brand hover | `--color-primary-700` | Hover state on primary buttons and links |
| Brand subtle | `--color-primary-50`, `--color-primary-100` | Selected row backgrounds, active item backgrounds, subtle highlights |
| Brand text | `--color-primary-700` | Links, active labels on light backgrounds |
| Primary text | `--color-neutral-900` | Page titles, headings |
| Body text | `--color-neutral-700` | Paragraph text, table cell text |
| Secondary text | `--color-neutral-500` | Labels, helper text, icons |
| Placeholder | `--color-neutral-400` | Input placeholders |
| Borders | `--color-border-default` (`--color-neutral-200`) | Card borders, dividers, input borders |
| Page background | `--color-surface-page` (`--color-neutral-50`) | Main page background |
| Cards | `--color-surface-card` (`#FFFFFF`) | Card backgrounds, elevated panels |
| Sidebar | `--color-surface-sidebar` (`--color-neutral-100`) | Sidebar background |

**Rules:**

1. Never use color as the sole indicator of state — always pair with text, icon, or pattern.
2. Never use raw hex/rgb values — always reference design tokens.
3. Semantic colors (`success`, `warning`, `error`, `info`) must only be used for their intended meaning.
4. Severity colors (`critical`, `high`, `medium`, `low`) map to the severity token scale.
5. Status colors (`new`, `active`, `completed`, `partial`, `failed`, `cancelled`, `paused`, `archived`) map to the status token scale.

### A.2 Typography Hierarchy

All text uses the Inter font family (`--typography-font-family-sans`).

| Role | Size | Weight | Color | Token refs |
|------|------|--------|-------|------------|
| Page title | 24px (`--typography-font-size-3xl`) | Semibold (600) | `--color-neutral-900` | Line height: tight (1.25), letter-spacing: tighter |
| Section heading | 18px (`--typography-font-size-xl`) | Semibold (600) | `--color-neutral-800` | Line height: tight, letter-spacing: tight |
| Subsection heading | 16px (`--typography-font-size-lg`) | Medium (500) | `--color-neutral-800` | Line height: snug |
| Body text | 14px (`--typography-font-size-base`) | Normal (400) | `--color-neutral-700` | Line height: normal (1.5) |
| Label | 13px (`--typography-font-size-sm`) | Medium (500) | `--color-neutral-600` | Line height: normal |
| Caption / helper | 12px (`--typography-font-size-xs`) | Normal (400) | `--color-neutral-500` | Line height: normal |
| Code / monospace | 13px (`--typography-font-size-sm`) | Normal (400) | `--color-neutral-700` | Font: `--typography-font-family-mono` |

**Rules:**

1. Maximum two font weights per screen region (e.g., semibold for headings + normal for body).
2. Never use font sizes outside the token scale.
3. Headings use `letter-spacing: tight` or `tighter` for a polished, Linear-like feel.
4. Body text always uses `line-height: normal` (1.5) for readability.

### A.3 Iconography

- **Library:** Lucide React (`lucide-react`), already bundled with shadcn/ui
- **Default size:** 16px (`w-4 h-4`)
- **Navigation/emphasis size:** 20px (`w-5 h-5`)
- **Large/empty-state size:** 48px (`w-12 h-12`)
- **Default color:** `--color-neutral-500`
- **Stroke width:** 1.5 (Lucide default, do not change)
- **Active/interactive icons:** Use `--color-primary-600`

**Rules:**

1. Prefer established Lucide icons over custom SVGs.
2. Decorative icons use `aria-hidden="true"`.
3. Meaningful icons include `aria-label` or wrap in a visually-hidden label.

### A.4 Illustration Style

None for v1. All empty states use icon + copy instead. Defer illustrations and graphics until the design system matures.

### A.5 Personality Touches

These subtle details differentiate Lumina from a generic admin panel:

| Touch | Implementation |
|-------|---------------|
| Sidebar header | Subtle violet-to-transparent gradient background on the logo/workspace area |
| Card style | `border-radius: lg` (8px), 1px border (`--color-border-default`), minimal shadow (`--shadow-xs`) |
| Transitions | 200ms ease default, all interactive elements transition color/bg/border |
| Focus rings | 2px `--color-primary-600` ring with 2px offset — visible and on-brand |
| Active nav item | `--color-primary-50` background + `--color-primary-600` text + 2px left border accent |
| Hover states | Subtle background shift: `--color-neutral-50` → `--color-neutral-100` |
| Badge style | Rounded-full (pill shape), small text, color-coded by semantic meaning |

---

## B. Layout Shell

### B.1 Shell Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│ Top Bar (48px)                                                       │
│ ┌─────────────┐  ┌──────────────────────────┐  ┌──────────────────┐ │
│ │ Workspace ▾  │  │ ⌘K Search...             │  │ 🔔  Avatar ▾    │ │
│ └─────────────┘  └──────────────────────────┘  └──────────────────┘ │
├────────────┬─────────────────────────────────────────────────────────┤
│ Sidebar    │ Content Area                                            │
│ (240px)    │                                                         │
│            │  ┌─ PageHeader ──────────────────────────────────────┐  │
│ ┌────────┐ │  │ Breadcrumbs                                      │  │
│ │ Logo   │ │  │ Page Title                        [Actions]      │  │
│ │ ~~~~~~ │ │  └──────────────────────────────────────────────────┘  │
│ ├────────┤ │                                                         │
│ │ Nav    │ │  ┌─ PageContent ─────────────────────────────────────┐  │
│ │        │ │  │                                                   │  │
│ │ Brands │ │  │  (page-specific content)                          │  │
│ │  ├ T1  │ │  │                                                   │  │
│ │  ├ T2  │ │  │                                                   │  │
│ │  └ T3  │ │  │                                                   │  │
│ │        │ │  │                                                   │  │
│ ├────────┤ │  │                                                   │  │
│ │Collapse│ │  └───────────────────────────────────────────────────┘  │
│ └────────┘ │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

### B.2 Sidebar

| Property | Value |
|----------|-------|
| Width (expanded) | 240px (`--layout-sidebar-width`) |
| Width (collapsed) | 48px (`--layout-sidebar-collapsed`) |
| Background | `--color-surface-sidebar` |
| Border | 1px right, `--color-border-default` |
| Header | Logo + workspace name, violet gradient background |
| Collapse trigger | Button at bottom of sidebar |
| Collapsed mode | Icon-only navigation with tooltips on hover |

**Navigation tree:**

```
Workspace
├── Dashboard
├── Brand A
│   ├── Overview
│   ├── Tracker 1
│   │   ├── Prompts
│   │   ├── Scans
│   │   ├── Findings
│   │   ├── Actions
│   │   └── Reports
│   └── Tracker 2
│       └── ...
├── Brand B
│   └── ...
└── Settings
```

**Nav item states:**

| State | Style |
|-------|-------|
| Default | `--color-neutral-600` text, transparent background |
| Hover | `--color-neutral-700` text, `--color-neutral-100` background |
| Active | `--color-primary-600` text, `--color-primary-50` background, 2px left border `--color-primary-600` |
| Collapsed | Icon only, tooltip shows label on hover |

### B.3 Top Bar

| Property | Value |
|----------|-------|
| Height | 48px (`--layout-topbar-height`) |
| Background | `--color-surface-card` (white) |
| Border | 1px bottom, `--color-border-default` |
| Left slot | Workspace switcher dropdown |
| Center slot | Command palette trigger (`Cmd+K` / `Ctrl+K`) |
| Right slot | Notification bell icon + User avatar dropdown |

### B.4 Content Area

| Property | Value |
|----------|-------|
| Background | `--color-surface-page` |
| Padding | 24px (`--layout-page-padding`) all sides |
| Max width (forms) | 1280px (`--layout-content-max-width`), centered |
| Max width (tables/dashboards) | None (fills available width) |

---

## C. Page Templates

### C.1 Dashboard Page

**Use for:** Tracker dashboard, workspace overview.

```
┌─ PageHeader ──────────────────────────────────────────┐
│ Dashboard                                  [Actions]  │
└───────────────────────────────────────────────────────┘

┌─ CoreMetricsRow ──────────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ Metric 1 │ │ Metric 2 │ │ Metric 3 │ │ Metric 4 │  │
│ │ 1,234 ▲  │ │ 89% ▼    │ │ 45 ─     │ │ 12 ▲     │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└───────────────────────────────────────────────────────┘

┌─ Charts Grid ─────────────────────────────────────────┐
│ ┌────────────────────────┐ ┌────────────────────────┐ │
│ │                        │ │                        │ │
│ │   Bar Chart            │ │   Line Chart           │ │
│ │                        │ │                        │ │
│ └────────────────────────┘ └────────────────────────┘ │
└───────────────────────────────────────────────────────┘

┌─ Recent Activity ─────────────────────────────────────┐
│ RecentScanRunsTable                                   │
└───────────────────────────────────────────────────────┘
```

**Components:** PageHeader, CoreMetricsRow, MetricCard, BarChartWrapper, LineChartWrapper, RecentScanRunsTable

### C.2 List / Table Page

**Use for:** Findings list, scan runs, prompts list, source citations.

```
┌─ PageHeader ──────────────────────────────────────────┐
│ Breadcrumbs                                           │
│ Findings                              [Export] [Filter]│
└───────────────────────────────────────────────────────┘

┌─ Filter Bar ──────────────────────────────────────────┐
│ [Status ▾] [Severity ▾] [Platform ▾]   Search...     │
└───────────────────────────────────────────────────────┘

┌─ DataTable ───────────────────────────────────────────┐
│ ☐ │ Finding          │ Severity │ Status │ Date       │
│───┼──────────────────┼──────────┼────────┼────────────│
│ ☐ │ Not mentioned... │ High     │ New    │ 2025-01-15 │
│ ☐ │ Competitor ci... │ Medium   │ Active │ 2025-01-14 │
│ ☐ │ Incorrect inf... │ Critical │ New    │ 2025-01-14 │
│───┴──────────────────┴──────────┴────────┴────────────│
│                         1 2 3 ... 12  │ 25 per page ▾ │
└───────────────────────────────────────────────────────┘
```

**Components:** PageHeader, BreadcrumbNav, DataTable, StatusBadge, SeverityBadge, Button, Select, Input

### C.3 Detail Page

**Use for:** Finding detail, content action detail, scan result detail.

```
┌─ PageHeader ──────────────────────────────────────────┐
│ Brands > Acme > Tracker 1 > Findings > Finding #42   │
│ Brand not mentioned in ChatGPT response  [Edit] [Del] │
└───────────────────────────────────────────────────────┘

┌─ Main Content (2/3) ──────────┐ ┌─ Sidebar (1/3) ──┐
│                                │ │                   │
│ ┌─ Evidence ─────────────────┐ │ │ Status: Active    │
│ │ AI answer excerpt...       │ │ │ Severity: High    │
│ │ Source citations...        │ │ │ Platform: ChatGPT │
│ └────────────────────────────┘ │ │ Confidence: 87%   │
│                                │ │ First seen: Jan 12│
│ ┌─ Actions ──────────────────┐ │ │ Last seen: Jan 15 │
│ │ Recommended actions...     │ │ │                   │
│ └────────────────────────────┘ │ │ ┌─ Related ─────┐ │
│                                │ │ │ Finding #39   │ │
│                                │ │ │ Finding #41   │ │
│                                │ │ └───────────────┘ │
└────────────────────────────────┘ └───────────────────┘
```

**Components:** PageHeader, BreadcrumbNav, Card, EvidenceSummaryBlock, StatusBadge, SeverityBadge, ConfidenceIndicator, ContentActionCard

**Note:** On screens below `xl` (1280px), the sidebar stacks below the main content.

### C.4 Form Page

**Use for:** Tracker creation, brand settings, workspace settings.

```
┌─ PageHeader ──────────────────────────────────────────┐
│ Create Tracker                                        │
└───────────────────────────────────────────────────────┘

          ┌─ Form (max-width: 640px, centered) ─────┐
          │                                          │
          │ Tracker Name                             │
          │ ┌──────────────────────────────────────┐ │
          │ │ My Brand Tracker                     │ │
          │ └──────────────────────────────────────┘ │
          │                                          │
          │ Brand                                    │
          │ ┌──────────────────────────────────────┐ │
          │ │ Select a brand...                  ▾ │ │
          │ └──────────────────────────────────────┘ │
          │                                          │
          │ Description                              │
          │ ┌──────────────────────────────────────┐ │
          │ │                                      │ │
          │ │                                      │ │
          │ └──────────────────────────────────────┘ │
          │                                          │
          └──────────────────────────────────────────┘

┌─ Sticky Footer ───────────────────────────────────────┐
│                               [Cancel]  [Create ▸]    │
└───────────────────────────────────────────────────────┘
```

**Components:** PageHeader, Input, Textarea, Select, Button, Card

### C.5 Wizard / Flow Page

**Use for:** Discovery flow, tracker setup wizard.

```
┌─ PageHeader ──────────────────────────────────────────┐
│ Set Up Tracker                                        │
└───────────────────────────────────────────────────────┘

┌─ Stepper ─────────────────────────────────────────────┐
│  (●)──────(●)──────(○)──────(○)                       │
│  Website   Review   Prompts  Confirm                  │
└───────────────────────────────────────────────────────┘

┌─ Step Content ────────────────────────────────────────┐
│                                                       │
│  (current step UI renders here)                       │
│                                                       │
└───────────────────────────────────────────────────────┘

┌─ Footer ──────────────────────────────────────────────┐
│  [← Back]                              [Next Step →]  │
└───────────────────────────────────────────────────────┘
```

**Components:** PageHeader, Progress, Button, step-specific components (DiscoveryConfirmationScreen, PlatformSelector, PromptReviewList, ReadyToCreateScreen)

### C.6 Empty State Page

**Use for:** First-time user states, no search results, error recovery.

```


              ┌─────────────────────────┐
              │                         │
              │      ┌────────────┐     │
              │      │   (icon)   │     │
              │      └────────────┘     │
              │                         │
              │   No trackers yet       │
              │                         │
              │   Trackers monitor how  │
              │   AI platforms talk     │
              │   about your brand.     │
              │                         │
              │   [Create a Tracker]    │
              │                         │
              └─────────────────────────┘


```

**Components:** EmptyState (icon 48px, title in section heading style, description in body text, CTA as primary Button)

---

## D. Interaction Patterns

### D.1 Loading

| Scenario | Pattern |
|----------|---------|
| Initial page load | Skeleton screen matching target layout (never a spinner) |
| Table loading | Skeleton rows (5 rows) with column widths matching headers |
| Card loading | Skeleton card with placeholder blocks for title, body, footer |
| Action in progress | Subtle horizontal progress bar at top of content area |
| Long-running task (scans) | Dedicated progress screen with status cards and animated counter |
| Inline loading | Small spinner (16px) next to the triggering element |

**Rules:**
- Skeleton composition must match the target layout shape.
- Show skeletons immediately (no artificial delay).
- Use `--color-neutral-200` for skeleton base, subtle pulse animation.

### D.2 Errors

| Scenario | Pattern | Components |
|----------|---------|------------|
| Form validation | Inline: red border on field, error message below in `--color-semantic-error-600`, 12px | Input, Textarea, Select |
| Transient server error | Toast: error variant, auto-dismiss 5s, optional retry action | Toast |
| Partial data failure | Warning banner at top of content area | PartialResultsWarning (Alert) |
| Fatal / unrecoverable | Full error page with icon, message, retry button | ErrorBoundary |
| 404 | Dedicated not-found page with navigation help | PageNotFound (EmptyState) |

**Error message format:** What went wrong + what to do next.
- Good: "Failed to load findings. Check your connection and try again."
- Bad: "Error 500"

### D.3 Navigation

| Pattern | Behavior |
|---------|----------|
| Page transitions | Instant (no animations between routes) |
| Breadcrumbs | Show for depth > 1 (e.g., Brands > Acme > Tracker 1 > Findings) |
| Sidebar | Highlights current location, expands parent tree nodes |
| Back navigation | Browser back button works correctly (URL-driven state) |
| Deep links | Every meaningful view has a unique, shareable URL |

### D.4 Modals (Dialog)

**Use only for:**
- Destructive action confirmations ("Delete this tracker?")
- Critical confirmations ("Start scan for all platforms?")

**Rules:**
- Keep content minimal — title, description, two buttons.
- Destructive confirms use `destructive` button variant (red).
- Always provide a clear Cancel option.
- Escape key closes the modal.
- Focus traps inside the modal.
- Focus returns to trigger on close.

### D.5 Drawers (Sheet)

**Use for:** Detail views that don't warrant a full page navigation.
- AI answer full text
- Finding evidence details
- Content action details
- Component property inspector

| Property | Value |
|----------|-------|
| Direction | Right side (default) |
| Width | 480px on desktop, full-width on mobile |
| Background | `--color-surface-card` |
| Overlay | `--color-neutral-900` at 50% opacity |
| Header | Title + close button (X icon) |
| Content | Scrollable, padded 24px |

### D.6 Toasts

| Property | Value |
|----------|-------|
| Position | Bottom-right |
| Auto-dismiss | 5 seconds |
| Max visible | 3 stacked |
| Action link | Optional (e.g., "Undo", "View") |
| Z-index | `--z-index-toast` (500) |

**Variants:**

| Variant | Icon | Border color |
|---------|------|-------------|
| Success | Check circle | `--color-semantic-success-500` |
| Error | X circle | `--color-semantic-error-500` |
| Warning | Alert triangle | `--color-semantic-warning-500` |
| Info | Info circle | `--color-semantic-info-500` |

### D.7 Popovers

**Use for:** Filters, quick selects, small inline forms, additional options.

| Property | Value |
|----------|-------|
| Trigger | Click (not hover) |
| Close | Outside click, Escape key |
| Max height | 320px with internal scroll |
| Arrow | Optional, pointing to trigger |

### D.8 Empty States

Every empty state must communicate three things:

1. **What this area shows** when populated
2. **Why it's empty** right now
3. **What to do next** (with a CTA)

Examples:

| Context | Title | Description | CTA |
|---------|-------|-------------|-----|
| No brands | No brands yet | Brands represent the companies or products you want to monitor across AI platforms. | Add your first brand |
| No trackers | No trackers yet | Trackers monitor how AI platforms talk about your brand by running prompts on a schedule. | Create a Tracker |
| No findings | No findings yet | Findings appear after your first scan completes. They highlight where and how AI mentions your brand. | Run your first scan |
| Search no results | No results found | Try adjusting your search terms or filters. | Clear filters |

### D.9 Command Palette

- **Trigger:** `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux)
- **Component:** Command (shadcn/ui)
- **Searches:** Pages, brands, trackers, recent items
- **Actions:** Quick-create tracker, start scan, navigate to settings
- **Behavior:** Fuzzy search, keyboard navigable, Escape to close

---

## E. Responsive Strategy

### E.1 Breakpoints

| Name | Width | Token |
|------|-------|-------|
| sm | 640px | `--breakpoint-sm` |
| md | 768px | `--breakpoint-md` |
| lg | 1024px | `--breakpoint-lg` |
| xl | 1280px | `--breakpoint-xl` |
| 2xl | 1536px | `--breakpoint-2xl` |

### E.2 Behavior by Breakpoint

| Breakpoint | Sidebar | Layout | Tables | Charts |
|------------|---------|--------|--------|--------|
| ≥ xl (1280px) | Expanded (240px) | Multi-column, detail page sidebar | Full table | Full charts |
| lg–xl (1024–1279px) | Collapsed (48px) | Multi-column | Full table | Full charts |
| md–lg (768–1023px) | Overlay (hamburger) | Single column | Horizontal scroll | Responsive, simplified labels |
| < md (< 768px) | Overlay (hamburger) | Single column, stacked cards | Card-based list view | Responsive, minimal labels |

### E.3 Detailed Responsive Rules

**Sidebar (below lg):**
- Auto-collapses to hidden state
- Hamburger menu icon appears in top bar (left side)
- Opens as overlay with backdrop (not pushing content)
- Closes on navigation or outside click

**Content (below md):**
- All multi-column layouts become single column
- Cards stack vertically with full width
- Detail page sidebar section moves below main content
- Metric cards: 2-column grid on `sm`, single column below

**Tables (below md):**
- Switch to horizontal scroll with sticky first column (name/title)
- Or switch to card-based list view for small datasets
- Always show: primary identifier + status
- Hide: timestamps, secondary metadata (available via expand)

**Charts (all sizes):**
- Use responsive container (100% width, aspect-ratio based height)
- Simplify axis labels on small screens
- Touch-friendly tooltip areas (larger hit targets)
- Consider hiding legends on mobile, using inline labels instead

**Forms:**
- Already single-column by default — no changes needed
- Full-width inputs on all screen sizes
- Sticky footer buttons remain fixed on scroll

**Minimum supported width:** 375px (iPhone SE)

**Touch targets:** Minimum 44x44px on all interactive elements on touch devices.

---

## F. Accessibility

### F.1 Standards

**Target:** WCAG 2.1 Level AA

### F.2 Color Contrast

| Element | Minimum Ratio |
|---------|---------------|
| Normal text (< 18px) | 4.5:1 |
| Large text (≥ 18px or ≥ 14px bold) | 3:1 |
| UI components and graphical objects | 3:1 |
| Decorative elements | No requirement |

All design tokens have been selected to meet these ratios on their intended backgrounds. Do not pair arbitrary token colors without verifying contrast.

### F.3 Keyboard Navigation

| Requirement | Implementation |
|-------------|---------------|
| Tab order | Follows visual layout (top-to-bottom, left-to-right) |
| Focus indicator | 2px `--color-primary-600` ring, 2px offset, all interactive elements |
| Escape | Closes modals, drawers, popovers, dropdowns, command palette |
| Enter/Space | Activates buttons, toggles, checkboxes |
| Arrow keys | Navigate within menus, radio groups, tabs, tree views |
| Cmd+K / Ctrl+K | Opens command palette from anywhere |

### F.4 Focus Management

| Scenario | Behavior |
|----------|----------|
| Modal opens | Focus moves to first focusable element inside modal |
| Modal closes | Focus returns to the element that triggered the modal |
| Drawer opens | Focus moves to drawer header or first focusable element |
| Drawer closes | Focus returns to trigger element |
| Popover opens | Focus moves into popover content |
| Popover closes | Focus returns to trigger element |
| Page navigation | Focus moves to page heading or main content area |
| Toast appears | Announced via `aria-live="polite"`, focus stays in place |

**Focus trapping:** Modals and drawers trap focus — Tab cycles within the overlay, not to background content.

### F.5 Screen Readers

| Requirement | Implementation |
|-------------|---------------|
| Landmarks | Use semantic HTML: `<nav>` (sidebar), `<main>` (content), `<aside>` (detail sidebar), `<header>` (top bar), `<section>`, `<article>` |
| Headings | Proper heading hierarchy (`h1` → page title, `h2` → sections, `h3` → subsections) |
| Interactive elements | All buttons, links, and form controls have accessible names |
| Images/icons | Decorative: `aria-hidden="true"`. Meaningful: `aria-label` or adjacent text |
| Dynamic content | Toasts and status updates use `aria-live="polite"` regions |
| Tables | Use `<th>` with `scope`, `<caption>` for table purpose |
| Forms | Labels linked to inputs via `htmlFor`/`id`. Error messages linked via `aria-describedby` |

### F.6 Motion

Respect the `prefers-reduced-motion` media query:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- All transitions (`--transition-fast`, `--transition-default`, `--transition-slow`, `--transition-spring`) become instant.
- Skeleton pulse animations stop.
- Rotating progress messages switch to static text.
- No content or functionality is lost.

---

## G. Cross-References

| Document | Relationship |
|----------|-------------|
| `design-tokens/tokens.json` | Source of truth for all visual values used in this document |
| `design-tokens/TOKENS.md` | Detailed token reference table with usage guidance |
| `design-tokens/generate-css.js` | Generates CSS custom properties from tokens |
| `agent-system/component-manifest.json` | Registry of all components referenced in page templates |
| `ARCH-003-frontend-architecture.md` | Frontend tech stack and coding rules |
| `AGENTS.md` | Agent rules including token and component manifest requirements |
| `ADDENDUM-001-unified-decisions.md` | Architecture decisions (SignalR, TanStack Router, CVA, etc.) |
