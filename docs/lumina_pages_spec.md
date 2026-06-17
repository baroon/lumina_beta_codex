# Lumina Product Page Specifications

Implementation brief for coding agent.

This document defines the recommended page structure, copy, metrics, tooltips, layout rules, drawers, filters, and UX behavior for Lumina as a standalone AI visibility strategy platform for SEO agencies, digital marketing teams, and client-facing marketing users.

## Product framing

Lumina is not a prompt tracker. Lumina helps marketing teams understand how AI platforms discover, describe, recommend, compare, and cite their brand, then turns those findings into SEO, content, citation, and reputation actions.

Core product model:

- **Brand Discovery** builds the strategic context.
- **Lenses** define the intent behind AI questions.
- **AI Questions** collect evidence from AI answers.
- **Recommendations** turn findings into action.
- **Reports** make the output client-ready.

## Global terminology

Use these labels consistently across the product.

| Internal / technical term | User-facing term |
|---|---|
| Prompt | AI Question |
| Prompt run | AI Answer / Answer Run |
| LLM response | AI Answer |
| Prompt category | Lens |
| Scan snapshot | Scan |
| Rank | Answer Position |
| Brand rank | Answer Position |
| Absence rate | Not-Mentioned Rate |
| Insights | Recommendations |
| Domain types | Citation Source Mix |
| Owned / competitor as source type | Source Relationship |
| Claims extraction | Claims AI Makes About You |
| Entity extraction | Entities Mentioned |

## Primary navigation structure

Use the Option B navigation structure.

### Dashboard

- Overview

### Strategy

- Lenses
- Recommendations
- Topics

### Intelligence

- AI Questions
- Competitors
- Sources
- Claims & Risks

### Reporting

- Reports
- Scan History

### Setup

- Brand Discovery
- Trackers
- Brands
- Workspace

## Global UX rules

1. **Do not expose technical pipeline language** in main UI. Avoid `PromptRun`, `ScanSnapshot`, `LLM`, `entity extraction`, `classifier`, or `orchestration`.
2. **Always show sample size for rates**, either inline or in tooltip. Example: `42% based on 728 buying-intent answers`.
3. **Use right-side drawers for evidence**. Do not navigate users away for quick inspection.
4. **Prefer bars and tables over donuts** when ranking or comparison matters.
5. **Use donuts sparingly** for simple part-to-whole summaries only.
6. **Never show raw ISO timestamps**. Use `18 May`, `25 May`, `1 Jun`, `8 Jun`, etc.
7. **Use purpose text under every page heading** to explain the page in business language.
8. **Show “not enough data yet” states** instead of sparse or empty charts.
9. **Use purple only for selected brand / selected tracker / key highlight**. Use neutral colors for competitors and semantic colors for status.
10. **Every chart, metric, and table must have a tooltip** explaining definition, calculation, and why it matters.
11. **Every important metric should drill down to evidence**: AI questions, AI answers, citations, entities, or claims.
12. **Every recommendation should have evidence**, impact, effort, lens, status, and an action CTA.
13. **Separate Source Type and Source Relationship**:
    - Source Type: Editorial, Reference, User-generated, Social, Review, Institutional, Marketplace, Corporate, Other, Unknown.
    - Source Relationship: Owned, Competitor-owned, Third-party neutral, Partner, Unknown.

## Global drawers

Use these drawers consistently across pages.

### Answer Evidence Drawer

**Trigger:** KPI cards, charts, AI question rows, recommendation evidence, topic rows, competitor rows.

**Title pattern:** `Evidence: {metric/question/topic/entity}`

**Subtitle pattern:** `{answerCount} answers · {platformCount} platforms · {citationCount} citations · {dateRange}`

**Tabs:**

- Summary
- Answers
- Citations
- Entities
- Claims

**Actions:**

- Add to report
- Create recommendation
- Open full page

### Recommendation Details Drawer

**Title pattern:** `Recommendation: {recommendationTitle}`

**Sections:**

- Why this matters
- Evidence
- Suggested implementation
- Affected lens
- Affected topics
- Affected platforms
- Impact / effort
- Status

**Actions:**

- Mark as planned
- Mark as done
- Add to report
- View evidence

### Source Details Drawer

**Title pattern:** `Source: {domainOrUrl}`

**Tabs:**

- Overview
- Cited answers
- URLs
- Classification
- Trends

**Actions:**

- Mark as owned
- Mark as competitor-owned
- Add to report
- View cited answers

### Competitor / Entity Details Drawer

**Title pattern:** `{entityName}`

**Tabs:**

- Overview
- Head-to-head
- Topics
- Recommendations
- Citations
- Evidence

**Actions:**

- Track as competitor
- Ignore entity
- Add to report
- View evidence

### Claim Review Drawer

**Title pattern:** `Claim: {shortClaimText}`

**Tabs:**

- Summary
- Occurrences
- Evidence
- Citations
- Review history

**Statuses:**

- Pending review
- Verified true
- Incorrect
- Needs context
- Ignored

**Actions:**

- Mark verified
- Mark incorrect
- Needs context
- Ignore
- Create recommendation
- Add to report

## Global filter drawer

Use a right-side filter drawer on analysis pages.

**Drawer title:** Filters

**Drawer description:** Refine this view by brand context, AI platform, lens, topic, audience, market, source, and sentiment.

**Filter groups:**

### Brand context

- Products & services
- Audiences
- Markets
- Trust signals

### Analysis context

- Lenses
- Topics
- AI platforms
- Sentiment

### Evidence context

- Source type
- Source relationship
- Answer status
- Recommendation status
- Claim status

**Count label rule:** Use `Discovery · 745 answers`, not `Discovery 745`.

---

# Page 1: Overview

## Page identity

- **Navigation group:** Dashboard
- **Route:** `/overview`
- **Icon suggestion:** `LayoutDashboard`, `Gauge`, or `Activity`
- **Primary users:** Agency owner, account manager, SEO lead, marketing lead, client stakeholder
- **Page role:** Executive command center

## Heading

Overview

## Purpose text

Monitor how AI platforms discover, describe, recommend, and cite your brand across the markets, topics, and audiences you care about.

## Context line

Based on `{answerCount}` AI answers across `{platformCount}` platforms from `{dateRange}`.

Example: `Based on 2,911 AI answers across 5 platforms from the last 30 days.`

## Primary questions answered

- How visible is my brand in AI answers?
- Is my brand being recommended?
- Are competitors ahead of me?
- Are AI platforms citing the right sources?
- What risks or actions need attention?

## Top controls

- Tracker selector
- Date range
- Filters button with active filter count
- Create report / Export action

## Page sections

### 1. Executive summary

**Heading:** Executive summary

**Purpose text:** A plain-English summary of what changed, what matters, and where attention is needed.

**Component:** AI-generated summary card.

**Example copy:**

India Today appeared in 61% of tracked AI answers over the last 30 days, up 8 points from the previous period. Buying-intent visibility is improving, but competitors are still cited more often in political news and current affairs queries. Owned citation share remains low at 16%, and one disputed factual claim appeared in 88 answers. Prioritize citation improvements and claim review this week.

**Actions:**

- View recommendations
- Create report
- View evidence

**Empty state:** No overview available yet. Run your first scan to generate AI visibility insights for this tracker.

### 2. AI visibility health

**Heading:** AI visibility health

**Purpose text:** Track the core signals that show whether AI platforms know, recommend, cite, and describe your brand correctly.

#### Metric: Visibility Score

- **Label:** Visibility Score
- **Supporting text:** Overall AI visibility health
- **Tooltip:** A composite score that summarizes how visible, prominent, recommended, cited, and positively described your brand is across the selected AI answers. Use it as a directional health indicator, not as a replacement for individual metrics.
- **Calculation note:** Weighted composite of mention rate, first-mention rate, recommendation rate, citation share, sentiment, and risk penalties.
- **Format:** `0–100`, example `67 / 100`
- **Positive direction:** Higher is better.
- **Drill-down:** Visibility Score breakdown drawer.

#### Metric: Brand Mention Rate

- **Label:** Brand Mention Rate
- **Supporting text:** % of AI answers where your brand appeared
- **Tooltip:** The percentage of analyzed AI answers that mentioned the selected brand at least once. Higher means AI platforms are more likely to surface your brand for the selected topics, markets, and lenses.
- **Calculation:** `answers mentioning brand / total analyzed answers`
- **Format:** Percentage
- **Positive direction:** Higher is better.
- **Drill-down:** Answer Evidence Drawer filtered to brand mentioned = true.

#### Metric: Recommendation Rate

- **Label:** Recommendation Rate
- **Supporting text:** % of buying-intent answers recommending your brand
- **Tooltip:** The percentage of buying-intent AI answers where your brand was explicitly recommended, suggested, or selected as a good option. This is especially useful for commercial and decision-stage visibility.
- **Calculation:** `buying-intent answers recommending brand / total buying-intent answers`
- **Format:** Percentage with sample size
- **Positive direction:** Higher is better.
- **Drill-down:** Evidence filtered to Buying Intent lens.

#### Metric: First-Mention Rate

- **Label:** First-Mention Rate
- **Supporting text:** % of answers where your brand appeared first
- **Tooltip:** The percentage of AI answers where your brand was the first brand or entity mentioned. This helps measure prominence, not just presence.
- **Calculation:** `answers where brand position = 1 / answers where brand was mentioned`
- **Format:** Percentage
- **Positive direction:** Higher is better.
- **Drill-down:** Evidence filtered by first mention position.

#### Metric: Owned Citation Share

- **Label:** Owned Citation Share
- **Supporting text:** % of citations from your owned domains
- **Tooltip:** The share of AI citations that point to your owned websites, pages, or verified brand properties. Higher owned citation share means AI platforms are relying more on your own content as evidence.
- **Calculation:** `citations from owned sources / total citations`
- **Format:** Percentage
- **Positive direction:** Higher is generally better, but third-party authority still matters.
- **Drill-down:** Sources page filtered to relationship = Owned.

#### Metric: Open Risks

- **Label:** Open Risks
- **Supporting text:** Claims or issues that need review
- **Tooltip:** The number of unresolved factual claims, negative sentiment drivers, disputed statements, or risky AI-generated descriptions detected for this brand.
- **Calculation:** Count of unresolved risk items from Claims & Risks.
- **Format:** Integer
- **Positive direction:** Lower is better.
- **Drill-down:** Claims & Risks filtered to unresolved.

### 3. Performance by lens

**Heading:** Performance by lens

**Purpose text:** See how your brand performs across the moments that matter: discovery, buying decisions, competitive comparisons, sentiment, citations, and content gaps.

**Component:** Six lens cards.

Each card shows lens name, one-line description, health status, primary metric, key issue or win, and CTA.

#### Lens: Discovery

- **Description:** Are AI platforms finding and mentioning your brand for broad category and market questions?
- **Primary metric:** Brand Mention Rate
- **Tooltip:** Discovery measures whether your brand appears when users ask broad awareness-stage questions about your category, services, topics, or market.
- **CTA:** Open Discovery lens

#### Lens: Buying Intent

- **Description:** Are AI platforms recommending your brand when users ask what to choose or who to trust?
- **Primary metric:** Recommendation Rate
- **Tooltip:** Buying Intent measures whether AI platforms recommend your brand in decision-stage questions, such as “best provider,” “which brand should I choose,” or “recommended solution for...”
- **CTA:** Open Buying Intent lens

#### Lens: Competitive

- **Description:** Which competitors appear more often, rank higher, or get recommended instead?
- **Primary metric:** Gap to leader or Share of Voice
- **Tooltip:** Competitive visibility compares your brand against tracked and discovered competitors across AI answers, recommendations, rankings, and citations.
- **CTA:** Open Competitive lens

#### Lens: Sentiment

- **Description:** How does AI describe your brand, and are there positive, negative, or risky themes?
- **Primary metric:** Positive Sentiment Share or Open Risks
- **Tooltip:** Sentiment measures how AI platforms characterize your brand, including positive themes, neutral descriptions, negative language, and claims that may need review.
- **CTA:** Open Sentiment lens

#### Lens: Citations

- **Description:** Which sources does AI use as evidence when discussing your brand and market?
- **Primary metric:** Owned Citation Share
- **Tooltip:** Citations measure the domains and URLs AI platforms use to support answers, including owned, competitor, third-party, editorial, reference, and user-generated sources.
- **CTA:** Open Citations lens

#### Lens: Content Gaps

- **Description:** Which topics, questions, and proof points should your content cover better?
- **Primary metric:** Open Content Opportunities
- **Tooltip:** Content Gaps identify topics and questions where competitors appear, rank, or get cited but your brand does not. These gaps can guide SEO, content, FAQ, and authority-building work.
- **CTA:** Open Content Gaps lens

### 4. Recommended actions

**Heading:** Recommended actions

**Purpose text:** Prioritized actions to improve AI visibility, citation authority, competitive positioning, and brand accuracy.

**Component:** Top 3–5 action cards or compact table.

**Fields:** Priority, Action, Lens, Impact, Effort, Evidence, Status, CTA.

**Tooltip:** Recommendations are generated from AI answer patterns, competitor gaps, citation behavior, sentiment risks, and missing topic coverage. Use them as a prioritized work queue for SEO and content improvements.

**Empty state:** No recommendations yet. Recommendations will appear after Lumina has enough answer, citation, competitor, and topic evidence.

### 5. Core performance charts

Show only the most important charts.

#### Chart: AI mention rate over time

- **Subtitle:** How often your brand appeared in tracked AI answers during the selected period.
- **Tooltip:** Shows the percentage of AI answers where your brand was mentioned at least once over time. Use this to spot visibility gains, drops, or scan-to-scan changes.
- **Type:** Line chart
- **X-axis:** Date
- **Y-axis:** Mention rate %
- **Click:** Open evidence for selected date / scan.
- **Empty state:** Not enough trend data yet. Run at least two scans to see visibility over time.

#### Chart: Share of voice

- **Subtitle:** Your brand’s share of all brand mentions compared with competitors and other discovered entities.
- **Tooltip:** Share of voice measures how much of the total brand/entity mention volume belongs to your brand compared with competitors and other entities found in AI answers.
- **Type:** Horizontal bar chart
- **Rules:** Highlight selected brand. Hide zero-share entities by default. Show top 8 plus Other.
- **Click:** Open Competitor / Entity Details Drawer.

#### Chart: Mentions by platform

- **Subtitle:** Compare where your brand appears most often across AI platforms.
- **Tooltip:** Shows brand mention rate by AI platform. Use this to identify where your brand is well represented and where visibility is weak.
- **Type:** Horizontal bar chart
- **Click:** Open evidence filtered by platform.

#### Chart: Citation source mix

- **Subtitle:** The types of sources AI platforms cite when answering questions about your brand and market.
- **Tooltip:** Shows the mix of source types used in AI citations, such as editorial, reference, user-generated, social, review, institutional, marketplace, and corporate sources.
- **Type:** Horizontal bar or compact stacked bar
- **Important:** Do not include Owned or Competitor as source types.
- **Click:** Sources page filtered by source type.

#### Chart/Table: Top entities in AI answers

- **Subtitle:** Brands and organizations most often mentioned alongside or instead of your brand.
- **Tooltip:** Shows the most frequently mentioned entities across analyzed AI answers. This helps identify competitors, adjacent brands, and market authorities that AI associates with your topics.
- **Type:** Compact table preferred
- **Columns:** Entity, Relationship, Mentions, Share of voice, Recommendation rate, Change.

### 6. Needs attention

**Heading:** Needs attention

**Purpose text:** Review risks, weak areas, and evidence that may require action.

#### Card: Claims to review

- **Description:** Factual claims AI makes about your brand that may need verification.
- **Tooltip:** Claims are extracted from AI answers and grouped when similar. Review them to confirm accuracy, correct misinformation, or flag disputed statements.
- **CTA:** Review claims

#### Card: Weak topics

- **Description:** Topics where your brand has low visibility or competitors are stronger.
- **Tooltip:** Weak topics are areas where your brand is rarely mentioned, ranked poorly, or not cited despite being relevant to your Brand Discovery profile.
- **CTA:** View topics

#### Card: Evidence explorer

- **Description:** Inspect the AI answers, citations, entities, and claims behind the metrics.
- **Tooltip:** Evidence lets you verify how metrics were calculated by reviewing the underlying AI questions, answers, citations, brand mentions, competitors, and extracted claims.
- **CTA:** Open AI Questions

## What not to show on Overview

- Raw recent chats feed
- Repeated factual claims
- Too many donuts
- Operational scan logs
- Lens-specific deep charts
- Prompt/template mechanics

---

# Page 2: Lenses

## Page identity

- **Navigation group:** Strategy
- **Route:** `/lenses`
- **Icon suggestion:** `Focus`, `ScanEye`, `Layers`, or `Target`
- **Primary users:** SEO strategist, content strategist, account manager, agency lead
- **Page role:** Strategic analysis by business intent

## Heading

Lenses

## Purpose text

Analyze AI visibility through strategic marketing lenses: discovery, buying decisions, competitive comparisons, sentiment, citations, and content gaps.

## Helper text

Lenses organize AI questions by business intent. Instead of tracking random prompts, Lumina checks how your brand performs across the moments that matter in AI discovery and decision-making.

## Primary questions answered

- Which business-intent areas are strong or weak?
- Are we discoverable in broad category questions?
- Are we recommended when buyers ask for options?
- Are competitors outranking or out-citing us?
- Which lens is producing the most urgent actions?

## Top controls

- Tracker selector
- Date range
- Lens tabs
- Filters
- Create report

## Layout

Use a lens overview plus individual lens subpages/tabs.

### Recommended tabs

- All lenses
- Discovery
- Buying Intent
- Competitive
- Sentiment
- Citations
- Content Gaps

## Section: Lens overview

**Heading:** Lens performance overview

**Purpose text:** Compare visibility, recommendations, citations, risks, and opportunities across each lens.

**Component:** Lens scorecard grid or table.

**Columns / fields:** Lens, Purpose, Primary metric, Score/status, Answer count, Key issue, Open recommendations, CTA.

### Lens definitions and copy

#### Discovery

- **Purpose:** Measures whether AI platforms mention your brand for broad awareness-stage category, service, topic, or market questions.
- **Primary question:** Does AI know we exist for the topics and markets we care about?
- **Primary metrics:** Mention rate, not-mentioned rate, first-mention rate, platform coverage.

#### Buying Intent

- **Purpose:** Measures whether AI platforms recommend your brand when users ask what to choose, buy, use, or trust.
- **Primary question:** When buyers ask for recommendations, does AI recommend us?
- **Primary metrics:** Recommendation rate, recommendation position, competitors recommended instead.

#### Competitive

- **Purpose:** Measures where competitors appear, rank, get cited, or get recommended more strongly than your brand.
- **Primary question:** Which competitors does AI prefer, and where are they beating us?
- **Primary metrics:** Share of voice, gap to leader, head-to-head wins/losses, competitor recommendation gap.

#### Sentiment

- **Purpose:** Measures how AI platforms describe your brand, including positive themes, neutral descriptions, negative language, and risky claims.
- **Primary question:** What does AI believe about us, and is that perception accurate?
- **Primary metrics:** Positive sentiment share, negative sentiment share, known-for themes, open risks.

#### Citations

- **Purpose:** Measures which sources AI platforms use as evidence when discussing your brand, competitors, topics, and market.
- **Primary question:** Which sources influence AI answers about us and our market?
- **Primary metrics:** Citation count, owned citation share, competitor citation share, source type mix, freshness.

#### Content Gaps

- **Purpose:** Identifies topics, questions, and proof points where your content is weak or competitors are more visible.
- **Primary question:** What content should we create or improve to increase AI visibility?
- **Primary metrics:** Topic visibility, content opportunity count, competitor-owned topics, unanswered buyer questions.

## Individual lens page template

Each lens tab/subpage should have the same structure but lens-specific metrics.

### Header

- Lens name
- Lens purpose text
- Answer count context line
- Primary CTA: `View recommendations`

### Top metrics

Each lens should have 3–5 KPI cards relevant to that lens.

### Main charts/tables

Each lens should show only charts that support that lens intent.

### Evidence section

A compact table of AI questions and answer evidence for that lens.

### Actions section

Top recommendations generated from that lens.

## Lens-specific metric tooltips

### Discovery Mention Rate

Percentage of Discovery-lens answers where your brand appeared at least once. Higher means your brand is more discoverable in broad awareness-stage AI questions.

### Not-Mentioned Rate

Percentage of relevant AI answers where your brand did not appear. Lower is better because it means fewer missed visibility opportunities.

### Buying Recommendation Rate

Percentage of buying-intent answers where your brand was explicitly recommended. Higher means AI platforms are more likely to suggest your brand during decision-stage queries.

### Competitor Gap

The difference between your brand and the leading competitor for the selected metric. A larger gap means the competitor has stronger AI visibility for that lens.

### Positive Sentiment Share

Percentage of sentiment-classified answers where AI described the brand positively. Higher indicates stronger favorable brand perception.

### Owned Citation Share

Percentage of citations pointing to your owned domains or verified brand properties. Higher means AI is relying more on your content as evidence.

### Content Opportunity Count

Number of detected topics, questions, or content improvements that could improve visibility, recommendations, or citation authority.

## Empty state

No lens data yet. Run a scan with AI questions mapped to this lens to see performance.

---

# Page 3: Recommendations

## Page identity

- **Navigation group:** Strategy
- **Route:** `/recommendations`
- **Icon suggestion:** `Lightbulb`, `ListChecks`, `Sparkles`, or `WandSparkles`
- **Primary users:** SEO strategist, content strategist, agency account manager, marketing lead
- **Page role:** Action workbench

## Heading

Recommendations

## Purpose text

Prioritized actions to improve AI visibility, citation authority, competitive positioning, content coverage, and brand accuracy.

## Primary questions answered

- What should we do next?
- Which actions have the highest impact?
- Which lens or topic does each action affect?
- What evidence supports the recommendation?
- What is already planned, done, or ignored?

## Top controls

- Tracker selector
- Date range
- Filters
- Status filter
- Impact filter
- Lens filter
- Create report

## Main sections

### 1. Recommendation summary

**Heading:** Recommendation summary

**Purpose text:** See the total action backlog by priority, status, and lens.

**Metrics:**

#### Open Recommendations

- **Tooltip:** Total number of active recommendations that are not marked done or ignored.
- **Positive direction:** Lower is better if work is being completed, but new recommendations can indicate newly discovered opportunities.

#### High-Impact Actions

- **Tooltip:** Recommendations estimated to have high potential impact on AI visibility, recommendation rate, citation authority, or risk reduction.

#### Quick Wins

- **Tooltip:** Recommendations with high or medium impact and low estimated effort.

#### Completed This Period

- **Tooltip:** Recommendations marked done during the selected date range.

### 2. Recommended action queue

**Heading:** Action queue

**Purpose text:** Work through prioritized actions with evidence, impact, effort, and status.

**Component:** Table with optional card mode.

**Columns:**

- Priority
- Recommendation
- Lens
- Topic
- Impact
- Effort
- Evidence
- Status
- Owner
- Last updated

**Column tooltips:**

- **Priority:** Combines impact, urgency, evidence volume, and risk level.
- **Impact:** Estimated potential effect on AI visibility, recommendations, citations, or risk reduction.
- **Effort:** Estimated implementation difficulty based on content, technical, or review complexity.
- **Evidence:** Number of AI answers, citations, claims, or competitor gaps supporting this recommendation.

**Statuses:**

- New
- Planned
- In progress
- Done
- Ignored

**Row click:** Recommendation Details Drawer.

### 3. Recommendation categories

**Heading:** Action categories

**Purpose text:** Understand what type of work Lumina is recommending.

**Categories:**

- Content improvement
- New content opportunity
- Citation improvement
- Competitive positioning
- Claim correction
- Trust signal improvement
- Technical / schema improvement
- Reporting / monitoring

### 4. Quick wins

**Heading:** Quick wins

**Purpose text:** High-value actions that should be relatively easy to complete.

**Component:** Cards.

**CTA:** View quick win / Mark planned.

## Example recommendation titles

- Fix disputed historical claim
- Improve owned citation coverage
- Create FAQ page for weak buying questions
- Add comparison page against `{competitor}`
- Add proof points for `{topic}`
- Strengthen market page for `{market}`
- Add trust signals to homepage
- Update stale cited page
- Create content brief for `{topicCluster}`

## Empty state

No recommendations yet. Lumina will generate recommendations after it has enough answer, citation, competitor, topic, and claim evidence.

CTA: Run scan

---

# Page 4: Topics

## Page identity

- **Navigation group:** Strategy
- **Route:** `/topics`
- **Icon suggestion:** `Tags`, `Network`, `FolderTree`, or `BookOpenText`
- **Primary users:** SEO strategist, content strategist, agency account manager
- **Page role:** Content strategy and topic ownership

## Heading

Topics

## Purpose text

Track which topics your brand owns in AI answers, where competitors are stronger, and what content opportunities can improve visibility.

## Primary questions answered

- Which topics do we own?
- Which topics are weak or missing?
- Which competitors dominate each topic?
- Which topics create the best content opportunities?
- How does topic visibility differ by platform and lens?

## Top controls

- Tracker selector
- Date range
- Filters
- Lens filter
- Market filter
- Export

## Sections

### 1. Topic visibility summary

**Metrics:**

#### Topics Tracked

- **Tooltip:** Number of topics associated with this tracker from Brand Discovery, user edits, and ongoing analysis.

#### Strong Topics

- **Tooltip:** Topics where your brand has high mention rate, strong answer position, or above-benchmark share of voice.

#### Weak Topics

- **Tooltip:** Topics where your brand has low visibility, poor answer position, or competitors are stronger.

#### Content Opportunities

- **Tooltip:** Topics where Lumina recommends creating, improving, or restructuring content based on AI answer gaps.

### 2. Topic leaderboard

**Heading:** Topic visibility

**Purpose text:** Compare brand visibility and competitor strength across tracked topics.

**Component:** Table.

**Columns:**

- Topic
- Lens coverage
- AI answers
- Brand mention rate
- First-mention rate
- Recommendation rate
- Leading competitor
- Content opportunities
- Trend

**Column tooltips:**

- **Lens coverage:** Lenses where this topic appears in tracked AI questions.
- **Leading competitor:** The competitor with the strongest visibility for this topic.
- **Content opportunities:** Number of recommended content actions linked to this topic.

**Row click:** Topic Details Drawer.

### 3. Topic coverage heatmap

**Heading:** Topic coverage by platform

**Purpose text:** See where your brand is strong or missing across topics and AI platforms.

**Chart type:** Heatmap.

**Values:** Use percentage metrics rather than binary 0/1 when possible.

**Cell options:**

- Mention rate
- Recommendation rate
- Average answer position
- Citation count

**Tooltip:** Shows how often your brand appears for each topic-platform combination. Use this to identify platform-specific content or visibility gaps.

### 4. Competitor-owned topics

**Heading:** Competitor-owned topics

**Purpose text:** Topics where competitors appear more often, rank higher, or get recommended instead of your brand.

**Component:** Table or ranked bars.

**Columns:** Topic, Leading competitor, Competitor mention rate, Your mention rate, Gap, Recommended action.

### 5. Content briefs / opportunities

**Heading:** Content opportunities

**Purpose text:** Suggested content improvements based on topic gaps, competitor visibility, and AI answer patterns.

**CTA:** Create recommendation / Generate content brief.

## Empty state

No topics found yet. Complete Brand Discovery or add topics to your tracker to start measuring topic visibility.

---

# Page 5: AI Questions

## Page identity

- **Navigation group:** Intelligence
- **Route:** `/ai-questions`
- **Icon suggestion:** `MessageSquareText`, `SearchCheck`, `MessagesSquare`, or `ListTree`
- **Primary users:** SEO strategist, analyst, power user, account manager
- **Page role:** Evidence and monitoring layer

## Heading

AI Questions

## Purpose text

Review the questions Lumina asks AI platforms and inspect the answers, mentions, citations, competitors, and claims behind your visibility metrics.

## Primary questions answered

- What AI questions are being tracked?
- Which lens, topic, market, or audience does each question belong to?
- Which questions mention or miss our brand?
- What did each AI platform answer?
- What evidence supports each metric?

## Top controls

- Tracker selector
- Date range
- Filters
- Lens tabs
- Search AI questions
- Export

## Top metrics

#### Questions Tracked

- **Tooltip:** Number of AI questions in the current view after filters are applied.

#### Questions Where Brand Appears

- **Tooltip:** Percentage of tracked AI questions where at least one answer mentioned the selected brand.

#### Average Visibility

- **Tooltip:** Average brand visibility across questions in this view, based on mention rate, answer position, and platform coverage.

#### Avg Mentions per Question

- **Tooltip:** Average number of brand mentions detected per AI question across answer runs and platforms.

## Sections

### 1. Questions by lens

**Heading:** Questions by lens

**Purpose text:** See how tracked AI questions are distributed across strategic lenses.

**Preferred component:** Compact table or cards, not donut-only.

**Columns:** Lens, Questions, Mention rate, Avg position, Open issues.

### 2. Visibility distribution

**Heading:** Visibility distribution

**Purpose text:** Understand how many questions are strong, moderate, weak, or missing for the selected brand.

**Buckets:**

- Not visible: 0%
- Weak: 1–25%
- Moderate: 26–50%
- Strong: 51–75%
- Dominant: 76–100%

**Tooltip:** Groups AI questions by how often the selected brand appears in answers. Use this to prioritize weak or missing questions.

### 3. AI questions table

**Heading:** Tracked AI questions

**Purpose text:** Inspect every tracked question and open answer evidence for each one.

**Columns:**

- AI question
- Lens
- Topic
- Market
- Audience
- Platforms
- Brand visibility
- Avg answer position
- Sentiment
- Citations
- Last run
- Status

**Column tooltips:**

- **Brand visibility:** Percentage of answer runs for this question where the brand appeared.
- **Avg answer position:** Average position where the brand appeared among mentioned brands or entities. Lower is better.
- **Citations:** Number of citations detected in answers for this question.

**Row click:** Answer History Drawer.

## Answer History Drawer

**Title pattern:** `Answer history: {AI question}`

**Subtitle pattern:** `{answerCount} answers · {platformCount} platforms · {brandMentionCount} brand mentions · {citationCount} citations`

**Cards per answer:**

- Platform
- Date
- Lens
- Sentiment
- Brand mentioned badge
- Recommended badge
- First mention position
- Citations
- Evidence snippet
- Full answer

**Tabs:** Summary, Answers, Citations, Entities, Claims.

**Actions:** Add to report, Create recommendation, Mark reviewed.

## Empty state

No AI questions match the selected filters. Adjust filters or update tracker configuration to include more questions.

---

# Page 6: Competitors

## Page identity

- **Navigation group:** Intelligence
- **Route:** `/competitors`
- **Icon suggestion:** `Swords`, `Trophy`, `UsersRound`, or `GitCompare`
- **Primary users:** SEO strategist, agency lead, account manager, client stakeholder
- **Page role:** Competitive visibility and market intelligence

## Heading

Competitors

## Purpose text

See which competitors AI platforms mention, recommend, rank, and cite more often than your brand.

## Primary questions answered

- Who does AI prefer over us?
- Which competitors are gaining or losing visibility?
- Where is our share of voice strongest or weakest?
- Which topics or lenses do competitors dominate?
- Which competitors should we track or ignore?

## Top controls

- Tracker selector
- Date range
- Filters
- Competitor selector
- Lens filter
- Add competitor
- Export

## Sections

### 1. Competitive summary

**Metrics:**

#### Your Rank

- **Tooltip:** Your brand’s rank among tracked and discovered entities based on the selected competitive metric.

#### AI Leader

- **Tooltip:** The entity with the highest visibility or share of voice in the selected period.

#### Your Share of Voice

- **Tooltip:** Your brand’s share of all entity mentions across analyzed AI answers.

#### Recommendation Rate

- **Tooltip:** The percentage of buying-intent answers where your brand was recommended.

#### Gap to Leader

- **Tooltip:** Difference between your brand and the leading entity for the selected metric. Smaller is better.

#### Biggest Mover

- **Tooltip:** The competitor with the largest positive change in visibility during the selected period.

### 2. Competitive leaderboard

**Heading:** Competitive ranking

**Purpose text:** Compare brands and entities by visibility, recommendations, sentiment, and change.

**Columns:**

- Rank
- Entity
- Relationship
- Mentions
- Share of voice
- Recommendation rate
- Avg answer position
- Sentiment
- Change

**Relationship values:** You, Competitor, Discovered, Partner, Unknown.

**Row click:** Competitor / Entity Details Drawer.

### 3. Where competitors lead

**Heading:** Where competitors lead

**Purpose text:** Identify competitors that appear more often, rank higher, or get recommended instead of your brand.

**Columns:**

- Competitor
- Lead type
- Gap
- Lens
- Topic
- Recommended action

**Lead types:** More mentions, Higher recommendation rate, Better answer position, More citations, Stronger sentiment.

### 4. Head-to-head comparison

**Heading:** Head-to-head comparison

**Purpose text:** Compare your brand directly against a selected competitor.

**Metrics:** Mention rate, recommendation rate, first-mention rate, owned/competitor citation share, sentiment, topics won/lost.

### 5. Competitive movement

**Heading:** Movers

**Purpose text:** See which competitors gained or lost AI visibility during the selected period.

**Tooltip:** Movers are calculated by comparing the selected period against the previous comparable period.

### 6. Co-mention landscape

**Heading:** Who appears alongside us

**Purpose text:** Understand which brands and entities AI commonly associates with your brand.

**Note:** Secondary section, not top of page.

## Empty state

No competitors found yet. Add competitors manually or complete Brand Discovery to let Lumina suggest competitors from your website and AI answer analysis.

---

# Page 7: Sources

## Page identity

- **Navigation group:** Intelligence
- **Route:** `/sources`
- **Icon suggestion:** `Link`, `Globe2`, `FileSearch`, or `BookMarked`
- **Primary users:** SEO strategist, digital PR team, content strategist, technical SEO user
- **Page role:** Citation authority and source influence

## Heading

Sources

## Purpose text

Understand which domains and URLs AI platforms use as evidence when answering questions about your brand, competitors, topics, and market.

## Page title option

Navigation label should be `Sources`; page concept can be shown as `Citation Authority` in section copy.

## Primary questions answered

- Which sources influence AI answers?
- Are AI platforms citing our owned pages?
- Are competitor-owned sources influencing answers?
- Which source types matter most?
- Are cited sources fresh, authoritative, and relevant?

## Top controls

- Tracker selector
- Date range
- Filters
- Domain/URL toggle
- Source type filter
- Relationship filter
- Export

## Sections

### 1. Citation summary

**Metrics:**

#### Total Citations

- **Tooltip:** Total citations detected across AI answers in the selected view.

#### Unique Domains

- **Tooltip:** Number of distinct domains cited by AI platforms.

#### Unique URLs

- **Tooltip:** Number of distinct URLs cited by AI platforms.

#### Owned Citation Share

- **Tooltip:** Percentage of citations pointing to your owned domains or verified brand properties.

#### Competitor Citation Share

- **Tooltip:** Percentage of citations pointing to competitor-owned domains or pages.

#### Top Source Type

- **Tooltip:** The most common source type among detected citations, such as editorial, reference, user-generated, or institutional.

### 2. Citation source mix

**Heading:** Citation source mix

**Purpose text:** See the types of sources AI platforms rely on.

**Source types:** Editorial, Reference, User-generated, Social, Review, Institutional, Marketplace, Corporate, Other, Unknown.

**Tooltip:** Source type describes what kind of website or page was cited. It is different from source relationship.

### 3. Source relationship mix

**Heading:** Citation relationship mix

**Purpose text:** See whether AI citations come from your own properties, competitors, neutral third parties, or partners.

**Relationships:** Owned, Competitor-owned, Third-party neutral, Partner, Unknown.

**Tooltip:** Source relationship describes how the cited source relates to the selected brand.

### 4. Owned source share over time

**Heading:** Owned source share over time

**Purpose text:** Track whether AI platforms are relying more or less on your owned content as evidence.

**Chart type:** Line chart.

**Tooltip:** Shows the share of citations pointing to owned domains over time. Higher means your content is becoming a stronger evidence source for AI answers.

### 5. Source authority

**Heading:** Source authority

**Purpose text:** Compare citation volume with source authority to identify influential sources.

**Charts:** Authority distribution, authority vs citations scatter.

**Tooltip:** Source authority is Lumina’s score for how influential or trustworthy a cited source appears to be. Define the exact scoring model in product help or tooltip expansion.

### 6. Citation freshness

**Heading:** Citation freshness

**Purpose text:** Understand whether AI platforms cite recent, stale, or unknown-date sources.

**Buckets:** Today, Last 7 days, Last 30 days, Older than 30 days, Unknown.

### 7. Cited sources table

**Heading:** Cited domains and URLs

**Purpose text:** Review the sources AI platforms cite and update source classification when needed.

**Columns:**

- Source
- Domain / URL
- Source type
- Relationship
- Citations
- AI platforms
- Lenses
- Authority score
- Last cited
- Trend
- Actions

**Row actions:** View cited answers, Mark as owned, Mark as competitor-owned, Add to report, Ignore source.

## Empty state

No citations found for the selected filters. Citation data will appear when AI answers include source references or search-enabled platforms return citations.

---

# Page 8: Claims & Risks

## Page identity

- **Navigation group:** Intelligence
- **Route:** `/claims-risks`
- **Icon suggestion:** `ShieldAlert`, `BadgeAlert`, `FileWarning`, or `CircleAlert`
- **Primary users:** Brand manager, PR team, agency lead, account manager, client stakeholder
- **Page role:** Reputation, factual accuracy, and risk review

## Heading

Claims & Risks

## Purpose text

Review factual claims, disputed statements, risky descriptions, and negative themes AI platforms generate about your brand.

## Primary questions answered

- What claims does AI make about our brand?
- Which claims need verification?
- Are there disputed or incorrect statements?
- What negative or risky themes appear repeatedly?
- What should we fix or monitor?

## Top controls

- Tracker selector
- Date range
- Filters
- Status filter
- Severity filter
- Claim type filter
- Export

## Sections

### 1. Risk summary

**Metrics:**

#### Open Risks

- **Tooltip:** Number of unresolved risk items, including disputed claims, negative themes, or risky AI descriptions.

#### Claims to Review

- **Tooltip:** Factual claims extracted from AI answers that have not yet been reviewed.

#### Disputed Claims

- **Tooltip:** Claims marked as disputed, incorrect, or requiring further context.

#### High-Severity Issues

- **Tooltip:** Risks with high recurrence, high brand impact, or strong negative/reputational concern.

### 2. Claim clusters

**Heading:** Claims AI makes about you

**Purpose text:** Similar claims are grouped together so repeated statements can be reviewed once instead of appearing as duplicates.

**Columns:**

- Claim
- Occurrences
- Platforms
- Lenses
- Status
- Severity
- First seen
- Last seen
- Recommended action

**Row click:** Claim Review Drawer.

**Tooltip:** Claims are extracted from AI answers and clustered when they appear to refer to the same factual statement.

### 3. Risk themes

**Heading:** Risk themes

**Purpose text:** Recurring negative, uncertain, disputed, or sensitive themes detected in AI descriptions.

**Examples:** outdated information, factual dispute, brand confusion, negative reputation, missing trust signal, competitor comparison weakness.

### 4. Known-for themes

**Heading:** What AI says you are known for

**Purpose text:** See recurring associations, strengths, and descriptors AI uses for your brand.

**Tooltip:** Themes are grouped from repeated AI descriptions. Similar words such as reliable, credible, and trusted should be grouped under a larger theme when appropriate.

### 5. Review workflow

**Heading:** Review workflow

**Purpose text:** Track which claims have been verified, corrected, ignored, or still need action.

**Statuses:** Pending review, Verified true, Incorrect, Needs context, Ignored.

## Empty state

No claims or risks detected yet. Claims will appear after Lumina has analyzed enough AI answers for factual statements and recurring brand descriptions.

---

# Page 9: Reports

## Page identity

- **Navigation group:** Reporting
- **Route:** `/reports`
- **Icon suggestion:** `FileText`, `Presentation`, `Send`, or `Newspaper`
- **Primary users:** Agency account manager, agency owner, marketing lead, client stakeholder
- **Page role:** Client and stakeholder communication

## Heading

Reports

## Purpose text

Create, schedule, and share client-ready summaries of AI visibility, competitive movement, citation authority, risks, and recommended actions.

## Primary questions answered

- What can I send to a client or stakeholder?
- What changed this week or month?
- Which actions should the client approve?
- Which reports are scheduled?
- What evidence should be included?

## Top controls

- Tracker selector
- Date range
- Create report
- Schedule report
- Export

## Sections

### 1. Report summary

**Metrics:**

#### Reports Created

- **Tooltip:** Number of reports generated for this tracker or workspace.

#### Scheduled Reports

- **Tooltip:** Number of active recurring email or shareable reports.

#### Last Report Sent

- **Tooltip:** Date when the most recent scheduled or manual report was sent.

#### Open Client Actions

- **Tooltip:** Recommendations included in reports that are not yet completed or dismissed.

### 2. Create report

**Heading:** Create report

**Purpose text:** Build a client-ready report using key metrics, lens summaries, recommendations, and evidence.

**Report sections:**

- Executive summary
- Visibility scorecards
- Lens performance
- Recommendations
- Competitors
- Sources / citations
- Topics and content gaps
- Claims & risks
- Evidence appendix

**Actions:** Preview, Export PDF, Share link, Schedule email.

### 3. Report templates

**Heading:** Report templates

**Purpose text:** Choose a report format based on the audience and use case.

**Templates:**

- Executive summary
- Weekly client update
- Monthly AI visibility report
- Competitive movement report
- Content opportunities report
- Citation authority report
- Risk review report

### 4. Report history

**Heading:** Report history

**Columns:** Report name, Tracker, Date range, Created by, Shared with, Status, Last opened, Actions.

## Empty state

No reports created yet. Create your first report from current tracker insights, recommendations, and evidence.

---

# Page 10: Scan History

## Page identity

- **Navigation group:** Reporting
- **Route:** `/scan-history`
- **Icon suggestion:** `History`, `RefreshCcw`, `Activity`, or `Clock3`
- **Primary users:** Power user, admin, support, technical SEO user
- **Page role:** Operational transparency

## Heading

Scan History

## Purpose text

Track when Lumina collected AI answers, which platforms were scanned, what completed successfully, and what changed.

## Primary questions answered

- When was data last collected?
- Did scans complete successfully?
- Which platforms or questions failed?
- What changed between scans?
- Can I rerun a scan?

## Top controls

- Tracker selector
- Date range
- Status filter
- Platform filter
- Run scan

## Sections

### 1. Scan summary

**Metrics:**

#### Last Completed Scan

- **Tooltip:** Most recent scan that completed successfully for the selected tracker.

#### Answers Collected

- **Tooltip:** Number of AI answers collected across platforms and questions in the selected period.

#### Success Rate

- **Tooltip:** Percentage of scheduled answer runs that completed successfully.

#### Failed Runs

- **Tooltip:** Number of answer runs that failed due to platform, timeout, configuration, or quota issues.

### 2. Scan history table

**Heading:** Scan runs

**Columns:** Scan date, Tracker, Platforms, AI questions, Answers collected, Status, Duration, Failures, Trigger, Actions.

**Actions:** View details, Rerun scan, Add scan summary to report.

### 3. Scan details drawer

**Title pattern:** `Scan: {date}`

**Tabs:** Summary, Platforms, AI Questions, Failures, Changes.

**Actions:** Rerun failed items, Export scan log, Open evidence.

## Empty state

No scans have run yet. Run the first scan to collect AI answers and generate visibility insights.

---

# Page 11: Brand Discovery

## Page identity

- **Navigation group:** Setup
- **Route:** `/brand-discovery`
- **Icon suggestion:** `Compass`, `ScanSearch`, `Sparkles`, or `Building2`
- **Primary users:** Agency strategist, onboarding user, account manager, admin
- **Page role:** Brand intelligence foundation

## Heading

Brand Discovery

## Purpose text

Review and refine the brand, market, audience, competitors, topics, products, services, and trust signals Lumina uses to generate relevant AI questions.

## Primary questions answered

- What does Lumina know about this brand?
- Which details came from website scan vs user confirmation?
- Are the products, services, markets, audiences, and topics correct?
- Which competitors and trust signals are being used?
- Is the tracker ready to generate strong AI questions?

## Top controls

- Brand selector
- Tracker selector
- Last crawl date
- Retry website scan
- Save changes

## Sections

### 1. Discovery summary

**Heading:** Brand intelligence profile

**Purpose text:** The strategic context Lumina uses to create AI questions and analyze visibility.

**Fields:** Brand name, website, description, category, primary market, language, confidence, last updated.

### 2. Website scan evidence

**Heading:** Website scan evidence

**Purpose text:** Pages Lumina scanned to understand the brand and generate recommendations.

**Columns:** URL, Page type, Status, Extracted signals, Last scanned.

### 3. Products & services

**Heading:** Products & services

**Purpose text:** Offerings Lumina uses to generate discovery, buying-intent, and content-gap questions.

**Behavior:** AI-suggested items require user confirmation. User-confirmed items should not be overwritten by future scans.

### 4. Audiences

**Heading:** Audiences

**Purpose text:** Target customer or reader groups used to shape AI questions and reporting context.

### 5. Markets

**Heading:** Markets

**Purpose text:** Geographic, language, or category markets where visibility should be monitored.

### 6. Topics

**Heading:** Topics

**Purpose text:** Strategic topics used to generate AI questions and measure topic visibility.

### 7. Competitors

**Heading:** Competitors

**Purpose text:** Tracked competitors suggested by Lumina or added by users for competitive visibility analysis.

### 8. Trust signals

**Heading:** Trust signals

**Purpose text:** Proof points AI may use to understand credibility, authority, and relevance.

**Examples:** awards, certifications, press mentions, case studies, reviews, founding history, expert authors, accreditations, customer logos.

## Status labels

- AI suggested
- User confirmed
- Needs review
- Low confidence
- Ignored

## Empty state

Start Brand Discovery by entering a brand website. Lumina will scan key pages and suggest products, services, audiences, markets, competitors, topics, and trust signals.

---

# Page 12: Trackers

## Page identity

- **Navigation group:** Setup
- **Route:** `/trackers`
- **Icon suggestion:** `Radar`, `Settings2`, `SlidersHorizontal`, or `RadioTower`
- **Primary users:** Admin, agency operator, power user
- **Page role:** Monitoring configuration

## Heading

Trackers

## Purpose text

Manage monitoring setups that define which brand, market, topics, competitors, lenses, platforms, and cadence Lumina should track.

## Primary questions answered

- What monitoring setups exist?
- Which brand and market does each tracker monitor?
- Which lenses, topics, competitors, and platforms are included?
- How often does the tracker run?
- Is the tracker active and healthy?

## Top controls

- Workspace selector
- Brand selector
- Create tracker
- Status filter

## Sections

### 1. Trackers table

**Columns:** Tracker name, Brand, Market, Lenses, Topics, Competitors, Platforms, Cadence, Status, Last scan, Actions.

**Column tooltips:**

- **Lenses:** Strategic AI question categories included in this tracker.
- **Cadence:** How often Lumina collects new AI answers for this tracker.
- **Status:** Whether the tracker is active, paused, incomplete, or needs attention.

### 2. Tracker details drawer/page

**Sections:**

- Basic details
- Brand and market
- Lenses
- Topics
- Competitors
- AI platforms
- Cadence
- Prompt/question allocation
- Report settings
- Email recipients

## Empty state

No trackers yet. Create a tracker to start monitoring AI visibility for a brand, market, and topic set.

---

# Page 13: Brands

## Page identity

- **Navigation group:** Setup
- **Route:** `/brands`
- **Icon suggestion:** `Building2`, `Badge`, `BriefcaseBusiness`, or `Store`
- **Primary users:** Agency admin, operator, account manager
- **Page role:** Client/brand management

## Heading

Brands

## Purpose text

Manage the brands, clients, domains, aliases, owned properties, and competitors used across Lumina trackers.

## Primary questions answered

- Which brands or clients are managed in this workspace?
- Which domains and properties are owned by each brand?
- What aliases should Lumina recognize?
- Which trackers belong to each brand?
- Which competitors are associated with each brand?

## Top controls

- Workspace selector
- Add brand
- Search brands
- Filter by status

## Sections

### 1. Brands table

**Columns:** Brand, Website, Owned domains, Trackers, Markets, Competitors, Last discovery update, Status, Actions.

### 2. Brand details drawer/page

**Sections:**

- Brand profile
- Owned domains
- Aliases
- Markets
- Products & services
- Competitors
- Trackers
- Users / access

## Empty state

No brands added yet. Add a brand or start Brand Discovery to create a brand profile.

---

# Page 14: Workspace

## Page identity

- **Navigation group:** Setup
- **Route:** `/workspace`
- **Icon suggestion:** `Settings`, `Users`, `UserCog`, or `Building`
- **Primary users:** Workspace admin, agency owner, operations user
- **Page role:** SaaS account and team settings

## Heading

Workspace

## Purpose text

Manage team access, workspace settings, billing limits, report defaults, and account-level preferences.

## Primary questions answered

- Who has access to the workspace?
- What role does each user have?
- What are the default report and notification settings?
- What plan limits apply?
- How are workspace preferences configured?

## Sections

### 1. Workspace profile

Fields: Workspace name, logo, default timezone, default currency/locale, primary contact.

### 2. Team members

Columns: User, Email, Role, Last active, Status, Actions.

Roles: Owner, Admin, Strategist, Viewer, Client viewer.

### 3. Notifications

Settings: scan completion, weekly summary, risk alerts, report delivery, failed scan alerts.

### 4. Plan and limits

Fields: brands, trackers, AI questions, platforms, scan frequency, reports, seats.

### 5. Integrations

Future-ready section: CMS, analytics, search console, Slack, email, webhooks.

## Empty state

Workspace settings are available after the workspace is created.

---

# Implementation notes

## Icons

Recommended Lucide-style icons:

| Page | Icon suggestions |
|---|---|
| Overview | LayoutDashboard, Gauge, Activity |
| Lenses | Focus, ScanEye, Layers, Target |
| Recommendations | Lightbulb, ListChecks, Sparkles, WandSparkles |
| Topics | Tags, Network, FolderTree, BookOpenText |
| AI Questions | MessageSquareText, SearchCheck, MessagesSquare, ListTree |
| Competitors | Swords, Trophy, UsersRound, GitCompare |
| Sources | Link, Globe2, FileSearch, BookMarked |
| Claims & Risks | ShieldAlert, BadgeAlert, FileWarning, CircleAlert |
| Reports | FileText, Presentation, Send, Newspaper |
| Scan History | History, RefreshCcw, Activity, Clock3 |
| Brand Discovery | Compass, ScanSearch, Sparkles, Building2 |
| Trackers | Radar, Settings2, SlidersHorizontal, RadioTower |
| Brands | Building2, Badge, BriefcaseBusiness, Store |
| Workspace | Settings, Users, UserCog, Building |

## Sidebar UX

Use grouped sidebar sections:

- Dashboard
- Strategy
- Intelligence
- Reporting
- Setup

Behavior:

- Groups are collapsible but default expanded on desktop.
- Active page has clear selected state.
- Use icon + label.
- On collapsed sidebar, show icons only with tooltips.
- Keep Setup group lower to avoid confusing first-time users.

## Subpage UX

Use tabs inside pages where a concept has multiple views but should not become separate left-nav items.

Examples:

- Lenses: All lenses, Discovery, Buying Intent, Competitive, Sentiment, Citations, Content Gaps.
- Sources: Domains, URLs, Source Types, Relationships.
- Competitors: Leaderboard, Gaps, Head-to-head, Movers.
- Claims & Risks: Claims, Risk Themes, Known For, Review Workflow.
- Reports: Create, Templates, History, Scheduled.

## Drawers vs pages

Use drawers for inspection and evidence. Use pages for workflows.

Examples:

- Clicking a metric opens evidence drawer.
- Clicking a recommendation opens recommendation drawer.
- Clicking `Open full page` navigates to full page with filters applied.
- Clicking a source opens source drawer.
- Clicking a competitor opens entity drawer unless user chooses full competitor page.

## Empty-state style

Every empty state should include:

- Plain explanation
- Why the data is missing
- Next action

Examples:

- `Not enough trend data yet. Run at least two scans to see visibility over time.`
- `No citations found for this period. Citation data appears when AI answers include source references.`
- `No competitors found yet. Add competitors manually or complete Brand Discovery to let Lumina suggest them.`

## Data quality warnings

Use small inline warnings where needed:

- Low sample size
- Not enough trend data
- Classification needs review
- Source relationship unknown
- AI-suggested, not confirmed
- Partial platform coverage

## Final product principle

Every page should answer a business question first, show metrics second, and provide evidence/actions third.

The product should feel like:

> Brand Discovery builds context. Lenses define intent. AI Questions collect evidence. Recommendations turn findings into action. Reports make it client-ready.
