# Lumina Product Critique and Direction

## Purpose of this document

This document summarizes the high-level critique of the current Lumina product experience and the proposed direction for evolving it into a standalone SaaS product for digital marketing teams, SEO agencies, and agency-client reporting workflows.

Detailed implementation guidance is covered separately in:

- `lumina_navigation_structure.md`
- `lumina_pages_spec.md`

This file is intentionally strategic and critical rather than exhaustive.

---

# 1. Current product assessment

Lumina already has a strong analytical foundation. The current product captures many of the right signals for AI visibility:

- brand mentions
- citations
- competitors
- prompts / AI questions
- sentiment
- source domains
- claims
- content gaps
- scan history
- platform-level performance
- recommendation behavior

The issue is not that the product lacks data. The issue is that the current experience exposes too much of the data model directly to the user.

At the moment, the product feels closer to an analytics console or internal monitoring dashboard than a polished standalone SaaS product for marketers and agencies.

The current UI answers:

> “What data did we capture?”

But the product needs to answer:

> “How is my brand performing in AI answers, why does it matter, and what should I do next?”

---

# 2. Main critique

## 2.1 Too data-heavy for the target user

The current UI contains many useful charts, tables, and metrics, but they are presented with limited prioritization. For a technical or internal analytics user, this is acceptable. For marketing users, it creates cognitive load.

A marketer or agency user should not have to interpret every graph to understand the story. The product should surface the meaning first, then allow drill-down into evidence.

Current risk:

> Users may see many charts but not immediately understand what changed, what matters, or what action to take.

Recommended direction:

> Start with summary, health, risks, and recommended actions. Push detailed evidence and diagnostics into deeper pages or drawers.

---

## 2.2 The product currently feels organized around implementation objects

The current navigation and pages are too close to internal system concepts:

- Prompts
- Sources
- Competitors
- Scans
- Brands
- Trackers

These are valid system entities, but they should not define the entire product experience.

For a standalone SaaS product, the structure should be organized around user jobs:

- understanding visibility
- comparing competitors
- finding content opportunities
- improving citations
- reviewing risks
- producing client reports
- taking action

Recommended direction:

> Keep implementation objects available, but reframe them using business-language pages and workflows.

---

## 2.3 “Prompts” makes the product sound technical

The word “Prompts” makes Lumina sound like a prompt tracking tool. That weakens the product positioning.

For marketers and agencies, the better concept is:

> AI Questions

This reframes prompts as the questions real users ask AI platforms during discovery, evaluation, comparison, and decision-making.

Recommended direction:

- Rename `Prompts` to `AI Questions`.
- Use `AI Answer` instead of `LLM response`.
- Use `Answer Evidence` instead of raw prompt-run detail.

---

## 2.4 Insights are too generic; actions should be central

The product currently has insight-like data, but the standalone product should lead users toward actions.

“Insights” is generic. It suggests observation.

“Recommendations” or “Actions” suggests outcome.

Recommended direction:

> Make `Recommendations` a primary product surface, not a secondary page.

This is where Lumina becomes valuable to agencies. Agencies need a prioritized work queue they can turn into SEO, content, digital PR, and brand-reputation tasks.

Example recommendation categories:

- create missing FAQ content
- strengthen service/category pages
- add comparison content
- improve owned citations
- fix disputed claims
- add trust signals
- publish case studies
- improve source authority
- address negative sentiment drivers
- create content for weak topics

---

## 2.5 Lenses should become the product’s strategic framework

The strongest conceptual differentiator in Lumina is the lens model.

The product should not simply track arbitrary prompts. It should evaluate AI visibility through specific marketing and business intents.

Recommended lenses:

- Discovery
- Buying Intent
- Competitive
- Sentiment
- Citations
- Content Gaps

These lenses should not behave like simple filters only. They should shape:

- prompt generation
- page organization
- dashboard cards
- metrics
- recommendations
- reports

A lens should answer a strategic question.

Examples:

- Discovery: Are AI platforms finding and mentioning us for broad category and market questions?
- Buying Intent: Are AI platforms recommending us when users ask what to choose?
- Competitive: Which competitors does AI prefer, and where are they beating us?
- Sentiment: How does AI describe us, and are there risks or incorrect claims?
- Citations: Which sources does AI use as evidence?
- Content Gaps: What topics and proof points should our content cover better?

Recommended direction:

> Make Lenses a first-class product area and a visible part of the Overview experience.

---

## 2.6 Discovery should remain visible after onboarding

The Discovery phase is a strong differentiator. It makes the product feel consultative and intelligent.

During Discovery, Lumina captures and recommends:

- brand name
- website understanding
- products and services
- audience
- market / geography
- competitors
- trust signals
- topics

This should not disappear after onboarding. It should become a reusable `Brand Discovery` page.

Recommended direction:

> Treat Brand Discovery as the strategic foundation for the tracker, not just a one-time setup wizard.

This helps users understand why the AI Questions exist and why the product is tracking specific topics, markets, competitors, and trust signals.

---

# 3. Proposed product direction

Lumina should move from:

> “Analytics on prompts”

To:

> “An AI visibility strategy platform for marketers and agencies.”

The product story should be:

> Brand Discovery builds the context. Lenses define the intent. AI Questions collect the evidence. Recommendations turn findings into action. Reports make it client-ready.

This direction makes Lumina feel like a thoughtful marketing product rather than a technical monitoring dashboard.

---

# 4. Proposed navigation direction

The recommended navigation model is organized around product jobs rather than database entities.

## Dashboard

### Overview

Purpose:

> Executive command center for AI visibility health, summary, lens performance, top actions, and risks.

The Overview should answer:

- How visible is the brand?
- Is it being recommended?
- Is it being cited?
- Are there risks?
- What should we do next?

---

## Strategy

### Lenses

Purpose:

> Strategic performance by business intent.

Includes:

- Discovery
- Buying Intent
- Competitive
- Sentiment
- Citations
- Content Gaps

Lenses should be first-class pages or tabs, not only chips or filters.

### Recommendations

Purpose:

> Prioritized action workbench for improving AI visibility.

This should include content actions, citation actions, competitor actions, risk fixes, and trust-signal improvements.

### Topics

Purpose:

> Topic visibility and content strategy.

This page should show which topics the brand owns, where competitors dominate, and what content opportunities exist.

---

## Intelligence

### AI Questions

Purpose:

> Transparent evidence layer showing the questions being tracked and the answers collected.

This replaces `Prompts`.

### Competitors

Purpose:

> Competitive intelligence showing who AI prefers, where competitors lead, and how the brand compares.

### Sources

Purpose:

> Citation authority and source influence.

This page should show domains, URLs, source types, source relationships, owned citation share, authority, freshness, and citation evidence.

### Claims & Risks

Purpose:

> Reputation and factual review area for claims AI makes about the brand.

This page should cluster repeated claims and provide verification workflow.

---

## Reporting

### Reports

Purpose:

> Client-ready and stakeholder-ready reporting.

Should support weekly/monthly summaries, shareable reports, exports, and scheduled delivery.

### Scan History

Purpose:

> Operational transparency for scan runs, failures, completion status, and data freshness.

This should not be a primary analytics page.

---

## Setup

### Brand Discovery

Purpose:

> Strategic foundation containing the brand profile, products/services, audiences, markets, competitors, topics, and trust signals discovered by AI and confirmed by the user.

### Trackers

Purpose:

> Monitoring configuration for brand, market, topics, competitors, platforms, cadence, and lenses.

### Brands

Purpose:

> Brand/client management, especially for agencies.

### Workspace

Purpose:

> Team, account, permissions, billing, and workspace settings.

---

# 5. High-level page principles

## 5.1 Overview should not be a chart dump

The Overview should contain:

- executive summary
- AI visibility health metrics
- lens snapshot
- top recommendations
- key trends
- risks and evidence shortcuts

It should not show every detailed chart.

Detailed analysis belongs on lens pages and intelligence pages.

---

## 5.2 Lenses should drive analysis and actions

Each lens should have:

- a business question
- a clear page heading and purpose text
- lens-specific metrics
- lens-specific charts
- lens-specific evidence
- lens-specific recommendations

A lens should not be just a filter applied to the same dashboard.

---

## 5.3 Recommendations should be treated as the main output

Recommendations are where users see value.

Every important insight should be convertible into an action.

Recommended action fields:

- priority
- action title
- lens
- affected topic
- affected platform
- affected competitor
- impact
- effort
- evidence count
- status
- CTA

---

## 5.4 Evidence should be available everywhere, but not shown everywhere

Users must be able to trust the data. Every metric, recommendation, claim, source, and chart should have a path to evidence.

Recommended pattern:

> Use right-side drawers for evidence drill-downs.

Common drawers:

- Answer Evidence drawer
- Recommendation Details drawer
- Source Details drawer
- Competitor Details drawer
- Claim Review drawer
- Visibility Score Breakdown drawer

This keeps pages clean while preserving transparency.

---

## 5.5 Reports should be designed for agencies

Agencies need to communicate results to clients.

Reports should summarize:

- visibility health
- wins/losses
- lens performance
- competitor changes
- citation performance
- content gaps
- risks
- recommended actions

Reports should be exportable and shareable.

---

# 6. UX critique of the current form

## 6.1 Too many charts have equal weight

The current UI gives similar visual priority to important and secondary charts. This makes it hard for users to know what matters.

Recommended direction:

- Put summary and actions first.
- Use primary charts only on Overview.
- Move diagnostics into deeper pages.

---

## 6.2 Donuts are overused

Donut charts look polished but are not always the best choice for data-heavy comparison.

Recommended direction:

- Use horizontal bar charts for rankings and share comparisons.
- Use tables when precision matters.
- Use donuts only for simple part-to-whole summaries with few categories.

---

## 6.3 Raw answer/chat feeds should not dominate Overview

Raw answers are useful as evidence, but they should not appear as a long feed on Overview.

Recommended direction:

- Use grouped evidence drawers.
- Use AI Questions as the full evidence page.
- Cluster similar prompts and similar claims.

---

## 6.4 Repeated claims should be clustered

The current claims experience risks showing repeated versions of the same issue.

Recommended direction:

> Cluster similar claims into claim groups with occurrences, platforms, severity, and status.

Example:

- Claim text
- Occurrences
- Platforms
- First seen
- Last seen
- Status
- Recommended action

---

## 6.5 Source type and relationship should be separated

The current source classification mixes concepts like `Editorial`, `Reference`, `Owned`, and `Competitor`.

This should be corrected.

Source type should describe the nature of the source:

- Editorial
- Reference
- User-generated
- Social
- Review
- Institutional
- Marketplace
- Corporate
- Other
- Unknown

Source relationship should describe the relationship to the tracked brand:

- Owned
- Competitor-owned
- Third-party neutral
- Partner
- Unknown

This distinction is important for product credibility and future analysis.

---

## 6.6 Too much purple reduces information hierarchy

The UI currently uses purple heavily across cards, icons, bars, and highlights.

Recommended direction:

- Purple should represent the selected brand or primary product accent.
- Competitors should use neutral colors.
- Green should indicate positive movement.
- Red should indicate risk or negative movement.
- Amber should indicate warning or needs attention.
- Grey/slate should represent neutral or unknown states.

---

## 6.7 Date formatting needs polish

Raw ISO timestamps in charts make the product feel unfinished.

Recommended direction:

Use user-friendly labels:

- `18 May`
- `25 May`
- `1 Jun`
- `8 Jun`

Never show raw ISO timestamps in visible chart axes.

---

## 6.8 Sparse charts need better empty states

Some charts currently look empty or underpowered when data is sparse.

Recommended direction:

Use explicit states:

- `Not enough data yet`
- `Run at least two scans to see trends`
- `No citation data found for this period`
- `No competitors detected yet`

Avoid showing large empty cards.

---

# 7. Product language recommendations

Use business and marketing language instead of technical implementation language.

| Avoid | Prefer |
|---|---|
| Prompts | AI Questions |
| Prompt runs | Answer Runs / AI Answers |
| LLM response | AI Answer |
| Insights | Recommendations |
| Domain types | Citation source mix |
| Avg brand rank | Average answer position |
| Absence rate | Not-mentioned rate |
| Topic ownership | Topic visibility / Topic share |
| Competitive gap | Where competitors lead |
| Factual claims to review | Claims AI makes about you |
| Source classification | Source type / Source relationship |

---

# 8. Recommended product narrative

Lumina should present itself as a strategic AI visibility product.

Recommended narrative:

> Lumina helps marketing teams understand how AI platforms discover, describe, recommend, and cite their brand — then turns those findings into SEO, content, citation, and reputation actions.

Shorter version:

> Lumina is not a prompt tracker. It is an AI visibility strategy platform.

Operational product model:

> Brand Discovery builds the context. Lenses define the intent. AI Questions collect the evidence. Recommendations turn findings into action. Reports make it client-ready.

---

# 9. Success criteria for the redesign

The redesigned product should make it easy for a marketer or agency user to answer these questions within the first few minutes:

1. How visible is my brand in AI answers?
2. Is AI recommending us or competitors?
3. Which topics do we own or miss?
4. Which sources are influencing AI answers?
5. What claims or risks need review?
6. What should we create, fix, or improve next?
7. What can I send to a client or stakeholder?

If the product answers these clearly, Lumina will feel like a standalone strategic SaaS product rather than an analytics layer over prompt runs.

---

# 10. Final recommendation

Do not discard the current work. The existing data model, charts, filters, and evidence patterns are valuable.

The required change is primarily product framing and information architecture:

- reduce chart overload on Overview
- make Lenses first-class
- rename technical concepts into marketing language
- elevate Recommendations
- introduce Topics and Claims & Risks as meaningful strategy pages
- preserve evidence through drawers
- make Brand Discovery visible beyond onboarding
- build Reports for agency workflows

The target experience should be:

> A marketer opens Lumina and immediately understands where the brand stands, why it matters, what changed, and what action to take next.
