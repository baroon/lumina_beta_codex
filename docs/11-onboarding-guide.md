# Lumina Onboarding Guide

> A single read-through that gets a new joiner — engineer, marketer, or founder — productive on
> Lumina. Read end-to-end the first time; treat it as a reference after. Existing docs
> (`00-master-project-brief.md` through `10-navigation-and-pages-plan.md`) are the canonical
> deep-dives this guide points to.

---

## Table of contents

1. [Lumina at a glance](#1-lumina-at-a-glance)
2. [The problem and the product promise](#2-the-problem-and-the-product-promise)
3. [How Lumina is different](#3-how-lumina-is-different)
4. [The mental model](#4-the-mental-model)
5. [Phase 1: Discovery — building the brand's prompt ingredients](#5-phase-1-discovery--building-the-brands-prompt-ingredients)
6. [The Visibility Lens system](#6-the-visibility-lens-system)
7. [Phase 2: Tracker setup and execution](#7-phase-2-tracker-setup-and-execution)
8. [Phase 3: Analysis — signal extraction and the measurement model](#8-phase-3-analysis--signal-extraction-and-the-measurement-model)
9. [Phase 4: Reporting — the page-by-page tour](#9-phase-4-reporting--the-page-by-page-tour)
10. [Architecture in one page](#10-architecture-in-one-page)
11. [Glossary](#11-glossary)
12. [Read this first — by role](#12-read-this-first--by-role)

---

## 1. Lumina at a glance

Lumina is an **AI visibility platform**. It answers one question for a brand: *"When people ask
ChatGPT, Claude, Perplexity, Copilot, Grok, or Gemini about my category or my problem, do those
AI platforms surface my brand — accurately, favorably, and in good company?"*

For each tracked brand, Lumina:

1. **Discovers** the brand's identity, products, audiences, markets, topics, competitors, and
   trust signals from the brand's own website plus targeted LLM passes.
2. **Generates** a structured set of prompts that simulate the questions a real buyer would ask,
   organized by **Visibility Lens** (Discovery, Buying Intent, Competitor Comparison, Sentiment &
   Trust, Citation Visibility, Content Gaps).
3. **Runs** those prompts against every selected AI platform on a chosen cadence (Daily, Weekly,
   Manual…) and stores both the assistant text and the full provider envelope.
4. **Extracts** structured signals from each answer — brand mentions, competitor mentions,
   citations, sentiment, recommendation rank, factual claims, risk flags, brand attributes,
   head-to-head aspect-level comparisons, topic ownership.
5. **Aggregates** signals into per-scan and per-window metrics.
6. **Surfaces** the metrics across a flat analytical sidebar (Overview, Prompts, Sources,
   Competitors, Insights · BETA, Scans), with a workspace-level scope selector so a single
   tracker, a brand's worth of trackers, or the entire workspace can be the lens.
7. **Closes the loop** with Findings (evidence-backed issues) and Content Actions (recommended
   next steps). v1 stops short of generating the content itself.

The product belongs to **SMB / founder-led teams** and **content marketing teams** first.
Enterprise integrations (GSC, GA4, CMS publishing, approval workflows) are deferred.

The product promise: *"Find where AI misses your brand — and what content to create or improve
next."*

---

## 2. The problem and the product promise

### Why AI visibility is a category

For 20 years SEO meant "rank on Google." Buyers now ask LLMs — ChatGPT, Claude, Perplexity —
before they hit a search engine. Those LLM answers carry implicit recommendations: which brands
get named, in what order, with what sentiment, and with what supporting citations. The brands
that get named, ranked first, and quoted favorably win the conversation. The brands that don't
appear at all are invisible in a way they never were on Google.

Three things make this hard for brands:

1. **Opacity.** There's no Google Search Console for an LLM. You can't see your impressions or
   queries. The AI conversation happens in private chat windows.
2. **Surface area.** Six major AI platforms (ChatGPT, Claude, Perplexity, Copilot, Grok,
   Gemini), each with their own model versions, retrieval behavior, system prompts, and
   recommendation tendencies. Manual checking doesn't scale.
3. **Non-stationarity.** The same prompt to the same model can return different brand lineups
   today vs. tomorrow. Without consistent, repeatable measurement you can't tell whether a
   change in your AI visibility came from your content, the model, or noise.

### What Lumina does

Lumina gives a brand the missing instrumentation: a stable, repeatable, structured measurement
of how every AI platform treats the brand across the prompts that actually matter for its
business. The output isn't just "you got mentioned 41% of the time." It's the structured
breakdown of where you appeared, where you didn't, who beat you on which aspect, what the AI
said about you (positive, negative, neutral), what factual claims it made (verified, disputed,
pending review), what sources it cited, and which topics you own vs. lose. Each measurement
points at a content-side cause: a missing comparison page, an outdated factual claim, a topic
where competitors get all the recommendations.

That last step is the product promise: **AI visibility issues become content actions**.

---

## 3. How Lumina is different

The honest framing: this is a competitive category. Peec, Profound, and Brandlight all do "AI
visibility tracking." Lumina differentiates on **discovery-first prompt generation**, the
**Visibility Lens system**, **simple UX over a normalized backend**, and an **outcome-first
reporting model**. Each is summarized below; the deep dive lives in the rest of this guide.

### vs. Peec

Peec is the closest reference point. The navigation IA (flat analytical sidebar, top-of-sidebar
scope selector, separate management routes) is explicitly Peec-inspired — see the IA decisions
in `10-navigation-and-pages-plan.md`.

Where Lumina diverges:

| | **Peec (reference IA)** | **Lumina** |
|---|---|---|
| Workspace model | One brand per workspace | Many brands per workspace; "tracker" is the scope unit |
| Prompt construction | User authors prompts directly | Discovery generates prompts from confirmed brand inputs; user can add/remove |
| Lens system | Implicit | Explicit, named, deterministic — 6 Visibility Lenses with per-lens templates |
| Coverage mapping | User maintains lists | Backend maintains coverage mappings (TrackerTopic, TrackerCompetitor, …) auto-derived from Discovery |
| Outcome layer | Metrics + dashboards | Metrics → Findings → Content Actions (action-first reporting principle) |

### vs. Profound

Profound is enterprise-tilted. Lumina's first ICP is SMB / founder-led / content-marketing
teams. The implications:

- **Setup time.** Profound assumes a paid implementation. Lumina goes from "URL entered" to
  "first scan running" in a single Discovery wizard.
- **Pricing.** Profound runs enterprise contracts. Lumina (eventually) ships self-serve plans
  — pricing decisions deferred to a later phase.
- **Reporting depth.** Both surface raw metrics. Lumina layers **Findings** and **Content
  Actions** so a marketer doesn't have to translate metrics into next steps.

### vs. Brandlight

Brandlight ships a polished "AI visibility score" leaderboard. Lumina explicitly does not lead
with a single composite score in v1. A composite score hides the diagnostic signal — the whole
point of Lumina is that "absent from 40% of category prompts" is a different problem from
"present everywhere but trailing competitors on price comparisons." Composite scores are on the
**deferred** list (`07-deferred-future-work.md`); the measurement model is the foundation.

### What Lumina deliberately doesn't do (yet)

The boundary matters as much as the feature list. v1 explicitly skips:

- Full content briefs / article generation / social post generation
- Workflow engine + CMS publishing + approval workflows
- GSC / GA4 / CMS integrations
- Composite visibility scores ("Visibility Score", "Blended Visibility")
- Multi-workspace / auth (deferred)
- Pricing/plan UX

This isn't ideology — it's focus. The product promise lives at the seam between *measurement*
and *recommendation*. Once that seam is right, the workflow + generation layers slot in.

---

## 4. The mental model

The single chain you'll see throughout the codebase, the docs, and the UI:

```
Workspace → Brand → Visibility Tracker → Prompts → Scan Runs → Findings → Content Actions
```

Each arrow is owned by one phase. Each phase produces an artifact the next phase consumes.

```
Phase 1: Discovery        Workspace + Brand → confirmed prompt ingredients
Phase 2: Tracker setup    Ingredients → Tracker → Prompts → first Scan Run
Phase 3: Analysis         Scan Run → AnswerSignals → ScanMetrics → Findings
Phase 4: Reporting        Findings + Metrics → UI → Content Actions
```

A new joiner who internalizes that chain has 80% of the product. The rest of this guide expands
each arrow.

### User-facing vs. internal vocabulary

User-facing terms are deliberately friendly. Internal terms are precise. Both matter — the UI
says **Visibility Tracker** because that reads better in marketing copy, but the database row
is `tracker_configurations`. The full mapping is in `01-product-vocabulary.md`. The fragments
that matter most:

| User-facing | Internal | Why the split |
|---|---|---|
| Visibility Tracker | `TrackerConfiguration` | Marketing reads "Tracker"; engineers need "configuration" because tracker settings change over time and each `ScanRun` snapshots the config used |
| Visibility Lens | `Lens` | Stable across both — same name |
| Scan Run | `ScanRun` | Same |
| Scan Check (progress UI) | `PromptRun` | `1 prompt × 1 AI platform`. Hidden from users except as a progress count |
| Finding | `Finding` | Same |
| Content Action | `ContentAction` | Same |
| Topic | `Topic` | Same |
| Source / Citation | `Source` / `Citation` | Same |

Avoid in v1 UI: "Project", "Prompt Set", "Focus Area", "Opportunity", "Insight", "Workflow",
"Coverage", "Prompt Run" (use Scan Check). These are either Peec-isms we deliberately diverge
from or internal mechanics we deliberately hide.

### Architectural principle: simple UX, normalized backend

This is the load-bearing principle behind every UI/data trade-off. The user never sees
"coverage mappings" — they see Topics, Competitors, Markets in the brand profile. The backend
stores `TrackerTopic`, `TrackerCompetitor`, `TrackerMarket` junction rows because those are
what the prompt generator and the analytics queries need. The simplification is real on the
user side; the normalization is real on the developer side; nothing leaks across the seam.

---

## 5. Phase 1: Discovery — building the brand's prompt ingredients

Discovery is the moment where Lumina earns its differentiation. Without Discovery, the user
would have to author a prompt list by hand — which is what every competitor demands. With
Discovery, Lumina builds the prompt list automatically from the brand's website, the user
confirms it in a 5-step wizard, and the system has the structured inputs it needs to generate
prompts that actually map to the brand's business.

The wizard maps to a sequence of internal extractions that each produce a confirmed
artifact. Every artifact is consumed downstream by either prompt generation, scan metrics, or
both.

### The five wizard steps

The user-facing wizard order, from `DiscoveryConfirmationScreen.tsx` and
`content/discovery.ts`:

1. **Brand Identity** — `BrandProfile` (name, aliases, industry, category, positioning,
   description, logo, website).
2. **Products & Services** — `Products` (each with name, description).
3. **Audiences & Markets** — `Audiences` (e.g. "ATS-using recruiters") and `Markets` (e.g.
   "United States").
4. **Competitive Landscape** — `Competitors` (named competitors). Topics are auto-derived from
   confirmed inputs and refined here.
5. **Review & Confirm** — combined editable summary of all sections, plus `TrustSignals`
   (reviews, certifications, case studies the AI should be able to find).

The system runs targeted LLM passes to suggest entries for each section. The user
selects/unselects, edits, and adds custom items. Each lens-style section can be refreshed up to
3 times to regenerate suggestions from a different angle.

### What each step feeds

This is the crucial chain — and the part of the product that's only implicit in existing docs.
A new joiner can read all 10 existing docs and still not see why the wizard is ordered the way
it is. The order isn't arbitrary; each step's confirmed artifact is an input to the next.

```
Crawl website (≤ 10 same-domain pages)
   │
   ▼
Extract BrandProfile, candidate Products, candidate Audiences,
candidate Markets, candidate TrustSignals
   │
   ▼
Brand Identity step → confirmed BrandProfile
   │
   ▼
Products step → confirmed Products
   │
   ▼
Audiences & Markets step → confirmed Audiences + Markets
   │
   ▼
[trigger] derive Topics from {BrandProfile.industry/category,
   confirmed Products, confirmed Audiences, confirmed Markets}
   │
   ▼
[trigger] derive Competitors from {BrandProfile.industry/category,
   confirmed Products, confirmed Markets}
   │
   ▼
Competitive Landscape step → confirmed Competitors + Topics
   │
   ▼
Review & Confirm → confirmed TrustSignals + final approval
   │
   ▼
Discovery complete
```

The Audiences & Markets step is the pivot: advancing past it kicks off the Topic and
Competitor re-derivations. That's why the wizard is ordered identity → products → audiences &
markets *before* competitive landscape. If a marketer tries to skip ahead to add competitors
first, the suggestions won't be grounded in the brand's actual products and markets.

### How Discovery powers prompt generation

Every confirmed artifact feeds the prompt generator (see
`GeneratePromptsCommandHandler.cs`). The handler builds prompts by combining:

- **Visibility Lens templates** — per-Lens phrasings (see `Lens` entity + `PromptTemplate`).
- **Coverage references** — `TrackerTopic`, `TrackerCompetitor`, `TrackerProduct`,
  `TrackerAudience`, `TrackerMarket` — every one of which is auto-populated from the
  corresponding confirmed Discovery artifact.

Example: the **Competitor Comparison** lens has templates like *"How does {brand} compare to
{competitor} for {topic}?"* The generator iterates over the cartesian product
`templates × topics × competitors`, substituting the placeholders. Topic and Competitor weren't
made up — they came from the wizard. The brand market is plumbed through so prompts can be
phrased market-naturally ("in the United States…"). Audiences feed the framing
("for recruiters…"). Products surface in feature-comparison prompts.

If the user skipped Discovery (which isn't possible in v1), the system would have nothing to
substitute into the templates, and the generator would produce nothing useful. **Discovery is
the engine of prompt quality.**

### What Discovery does *not* store in prompts

Two important non-features, documented as design decisions in memory:

- **Brand aliases** are stored on the BrandProfile for **reporting and mention detection**
  — they are deliberately not substituted into Discovery prompts. The reason: a prompt like
  "Tell me about {alias}" leaks the brand identity into the question; we want to measure
  whether AI surfaces the brand *unprompted*.
- **Trust signals** are a Phase-3 **scoring reference** — they're shown in the brand profile
  and used to interpret what citations to expect, but they are not substituted into prompts
  either.

These are easy traps for a new joiner to fall into ("why don't we put aliases into the
prompts?"). The answer is: because measurement integrity depends on the AI surfacing the brand
without being told.

---

## 6. The Visibility Lens system

A Visibility Lens is **a category of question a buyer asks AI about a brand**. Lumina ships
six. Each lens has its own prompt templates, its own way of stressing the brand's positioning,
and its own analytical signature in the metrics.

The lenses are seeded as static data (`LensConfiguration.cs`) — `Code` + `Name` +
`Description` + `DisplayOrder`. Every new Visibility Tracker gets all 6 lenses assigned by
default (the "min 1 lens per tracker" invariant is preserved in code today, not as a DB
constraint).

### The six lenses

In display order:

**1. Discovery** — *"Does the AI surface the brand when asked about the category or topic?"*

Top-of-funnel. Templates ask open category questions: *"What are the best resume builders?"*,
*"Recommend a CRM for a 10-person sales team."* The brand isn't named in the prompt. Lumina
measures whether AI mentions it (mention rate), where in the recommendation order (first-mention
rate / average rank), and which competitors appear instead (share-of-voice).

**2. Buying Intent** — *"Is the brand recommended for high-intent, purchase-oriented prompts?"*

Mid-funnel. Templates carry decision language: *"I'm ready to buy a CRM, which one should I
pick?"*. Same measurements as Discovery but the prompts narrow on user intent — discovering a
brand that surfaces only for browsing but never for buying is a real diagnostic outcome.

**3. Competitor Comparison** — *"How does the AI compare the brand against its competitors?"*

Bottom-funnel adversarial. Templates explicitly name a competitor: *"{brand} vs {competitor}
for {topic} — which is better?"*. Surface area is `templates × competitors × topics`. The
distinct outcome is **per-aspect win/loss data** — which competitor beats the brand on price,
on support, on ease of use. The measurement model captures `MentionComparison` rows
(`aspect`, `winCount`, `lossCount`) per scan to power the head-to-head card.

**4. Sentiment & Trust** — *"What sentiment and trust signals does the AI express about the
brand?"*

Reputational. Templates probe for sentiment: *"Is {brand} reliable?"*, *"What do people say
about {brand}'s customer support?"*. Outcomes: per-mention sentiment (Positive/Neutral/Negative)
and per-attribute polarity (e.g. *"trustworthy"* (positive, 8 mentions) vs *"slow"* (negative,
3 mentions)).

**5. Citation Visibility** — *"Is the brand's own content cited as a source in AI answers?"*

Source-side. Templates push the AI to back its answers with citations. Outcomes: per-domain
citation count, per-URL citation count, source-type breakdown (Editorial, Forum, Reviews,
Brand-owned), and owned-citation share. This is what powers `/sources/domains` and
`/sources/urls`.

**6. Content Gaps** — *"Where is the brand absent from AI answers when it should be present?"*

Diagnostic. Templates exercise edge cases of the brand's claimed positioning. Outcomes:
**brand absence rate** (fraction of answers with neither brand mention nor owned citation) and
**topic ownership** (per topic: total prompts vs. brand-mentioned prompts → ownership %). A
brand can have a strong average mention rate and still have specific topics where it's absent
— Content Gaps is how you find them.

### Why 6 and not 1

A naive AI visibility product asks "did the brand get mentioned?" and stops. That single number
is unactionable. "We got mentioned 41% of the time" doesn't tell a marketer what to write next.
The Lens system separates the measurement into question-types that map onto content actions:

- Discovery lens low → invest in top-of-funnel category content.
- Buying Intent low → buyer's guide / comparison pages / case studies.
- Competitor Comparison shows losses on price → publish a pricing-transparency page.
- Sentiment & Trust shows negative attribute "slow" → publish performance benchmarks.
- Citation Visibility low → invest in citable assets (data, original research, reviews).
- Content Gaps shows topic ownership ≤ 33% on "career advice" → publish a career-advice hub.

Every signal a new joiner sees in the UI is attributable back to a Lens. That's the value of
the explicit Lens model.

### Lenses × Coverage = prompts

The prompt generator (`GeneratePromptsCommandHandler`) walks the cartesian product per Lens:

```
For each Lens assigned to the Tracker:
   For each Template registered for that Lens:
      For each Topic on the Tracker (and each Competitor / Product / Market /
      Audience the template references):
         Render template → Draft Prompt
```

The user reviews the generated Draft prompts on the `PromptReviewScreen` and can
regenerate **all** prompts, **per-lens**, **per-topic**, or **per (lens × topic)**. Once
confirmed, prompts become Active and the first scan can be queued.

---

## 7. Phase 2: Tracker setup and execution

### From Discovery to Tracker

Discovery completion lands the user on a "Ready to create your Visibility Tracker" screen
(`ReadyToCreateTrackerScreen.tsx`). A default tracker name is suggested. Clicking **Create
Visibility Tracker** does the following in one transaction:

1. Create `TrackerConfiguration` (linked to the brand).
2. Materialize **coverage mappings** by copying confirmed Discovery selections into
   `TrackerTopic`, `TrackerCompetitor`, `TrackerProduct`, `TrackerAudience`, `TrackerMarket`.
3. Auto-assign all 6 lenses via `TrackerLens` rows.
4. Generate Draft prompts via the cartesian product described above.

The user is then routed to `PromptReviewScreen` to confirm the prompts.

### Prompts: review, edit, regenerate

On `/brands/$brandId/trackers/$trackerId/edit` (and during initial setup) the user can:

- **Remove** a Draft prompt — if it has no scan history yet, it's hard-deleted (cascades
  through the 5 M:N rows: `PromptTopic`, `PromptCompetitor`, `PromptProduct`,
  `PromptAudience`, `PromptMarket`). If it has scan history, it's soft-archived so Mention /
  Citation evidence stays attributable.
- **Add** a custom prompt — pick the Lens and primary Topic; the system treats it the same as
  generated prompts for analytics.
- **Edit** a prompt's text inline.
- **Regenerate** at granular slices: all, by Lens, by Topic, by (Lens × Topic). Regeneration
  replaces only generated Drafts in the slice; user-added prompts stay.

There's a **Prompt Allocation** cap per tracker (today's default is 50). The Add Prompt button
is disabled when the count hits the cap.

### Platforms and cadence

`TrackerScheduleScreen.tsx` configures:

- **Cadence** — Daily / Weekly / Monthly / Manual.
- **Timezone** — for scheduled runs.
- **Platforms** — the AI providers to scan against (ChatGPT, Claude, Perplexity, Copilot,
  Grok, Gemini). A platform shows as `configured: true` when the workspace has an API key.
  Unconfigured platforms can be selected but won't be runnable until a key is added.

Platform configuration is stored in `TrackerPlatform` rows; per-workspace API keys live in
`apps/api/AIVisibility.Api/appsettings.Local.json` for local dev (gitignored).

### The Scan Run anatomy

Clicking **Run scan now** does the following:

1. Create a `ScanRun` snapshot — captures the current Tracker config, prompts, and platform
   selection so that even if the user edits the tracker tomorrow, the scan's measurements stay
   reproducible. ("Immutable run principle" from `05-cross-cutting-decisions.md`.)
2. Enqueue a Hangfire background job that fans out **Scan Checks** — one per `(prompt ×
   platform)`. With 30 prompts and 4 platforms, that's 120 Scan Checks.
3. Each Scan Check:
   - Calls the provider with the prompt text.
   - Stores the assistant text in `ai_answers.answer_text`.
   - Stores the full provider envelope (token counts, finish reason, system fingerprint, tool
     traces, safety flags) in `ai_answers.raw_response`.
   - Triggers inline signal extraction (Phase 3).
4. The UI surfaces a live progress count (`24 of 24 checks complete`) and live status per
   Scan Check.

Today's scan loop parallelizes **across platforms within each prompt** — each provider has its
own rate-limit bucket. Further parallelism (extraction off the scan loop; across prompts) is
on the deferred list (`07-deferred-future-work.md`).

When all checks finish (or the configured retry window elapses for failed ones), the
`ScanRun.scanStatus` flips to **Completed** or **PartiallyCompleted**, and an `AnalysisJob`
is queued to do post-scan aggregation.

---

## 8. Phase 3: Analysis — signal extraction and the measurement model

This is where raw AI text becomes structured data. The measurement model is the part of Lumina
that's been most extensively expanded in recent work, and it's what differentiates the product
from "we count brand mentions" competitors.

### From AIAnswer to structured signals

Each `AIAnswer` (one row per Scan Check) gets passed to the extraction pipeline. The pipeline
runs an LLM pass to identify and classify, then writes structured rows into:

- **`AnswerSignal`** — one summary per answer: did the brand appear, was it recommended,
  certainty, recommended-entities list, rank universe size.
- **`Mention`** — one row per entity (brand or competitor) appearing in the answer, with rank,
  prominence, recommendation score, sentiment, sentiment score.
- **`MentionAttribute`** — per-mention adjectives/descriptors (e.g. *"trustworthy"*,
  *"affordable"*) with polarity (Positive / Negative / Neutral).
- **`MentionRiskFlag`** — per-mention risk signals (e.g. *"layoffs"*, *"outage"*, *"lawsuit"*)
  with severity.
- **`MentionComparison`** — head-to-head aspect-level comparison rows. Each row says "on
  aspect X, brand A beat brand B" or vice versa.
- **`MentionPair`** — co-mention pairs (when both brand A and brand B appear in the same
  answer, the relationship is recorded).
- **`MentionRecommendationContext`** — structured context for *why* a brand was
  recommended (e.g. *"because the user mentioned a small team"*).
- **`MentionTopicRecommendation`** — per-mention topic triple (which topic context fed the
  recommendation).
- **`FactualClaim`** — per-mention factual assertions the AI made about a brand (e.g.
  *"Acme was founded in 1975"*) with verifiability classification (Verifiable / Opinion /
  Unverifiable) and a review status (Pending / Verified / Disputed).
- **`Citation`** — per-answer source references with the citing URL and (when extractable)
  source domain.
- **`Source`** + **`SourceUrl`** + **`BrandSourceClassification`** — normalized source
  inventory with per-domain authority score, recency, and per-brand classification (Owned vs.
  Independent vs. Editorial vs. Forum vs. …).
- **`AnswerRecommendation`** — full ordered recommended-entities list per answer.

### From signals to ScanMetrics

`ScanMetric` rows aggregate signals into per-scan, per-window numbers that the UI consumes:

- **Hero KPIs** — Queries, Mentions, Citations, Brand mention rate.
- **Absence rate / First-mention rate** — diagnostic counters.
- **Top entities** — ranked by visibility, with share-of-voice and sentiment.
- **Series** — per-entity time series (BrandMentionRate / MentionRate / BrandShareOfVoice /
  OwnedCitationShare / AverageBrandRank / OverallSentiment).
- **Topic ownership** — per topic: total prompts, brand-mentioned prompts.
- **Co-mention landscape** — per competitor: co-mention count, total competitor mentions.
- **Top attributes** — most-cited polarity-tagged attributes for the brand.
- **Top risk flags** — most-cited risk types with severity.
- **Top comparisons** — per-aspect wins/losses across competitors.
- **Recent factual claims** — newest-first feed for review.

This is the measurement model expansion that powers the Insights / Workspace Overview / per-
tracker Overview pages.

### TrendPoint denormalization

Per-entity time series (the lines on the trend charts) come from `TrendPoint` rows — a
denormalized projection populated when a scan completes. The denormalization is deliberate:
querying for "Acme's visibility over the last 30 days" should be a fast read against indexed
rows, not a join across `ScanRun → AnswerSignal → Mention`. The trade-off is that adding a new
metric to the trend layer requires teaching the denormalizer about it.

### Findings and Content Actions

This layer is **partially shipped** in v1:

- Findings detection rules and the LLM step that writes user-friendly Finding explanations are
  on the roadmap but not the immediate next step.
- Content Action types and the LLM step that writes the action titles/recommendations follow
  Findings.

Today the workspace surfaces lean on **signal highlights** as a bridge — short bulleted
summaries of the measurement-model signals (see `lib/signalHighlights.ts`). When Findings
ship, signal highlights become the entry point to a Finding card, which is the entry point to
a Content Action. The chain is built, the LLM-authored copy is what's pending.

---

## 9. Phase 4: Reporting — the page-by-page tour

This section is the working reference: every shipped page, what question it answers, what's on
it, and who reads it. The IA is locked in `10-navigation-and-pages-plan.md`; this is the
read-only tour version.

### Sidebar shape

```
TrackerSelector (top — multi-select, grouped by brand, all-on by default)

ANALYTICS
  Overview          /overview
  Prompts           /prompts
  Sources › Domains /sources/domains
  Sources › URLs    /sources/urls
  Competitors       /competitors
  Insights · BETA   /insights
  Scans             /scans

MANAGE
  Brands            /brands  (Trackers reachable via expandable rows)

SETTINGS
  Workspace         /settings/workspace  (stub)
  Profile           /settings/profile    (stub)
```

The **TrackerSelector** is the scope unit for every analytical surface. Pick a subset of
trackers, the analytical pages filter to those trackers. Pick one tracker = single-tracker
focus. Pick all = workspace-wide view. The selection is mirrored to the URL as `?trackers=…`
so a shared link reproduces the scope.

### Analytical surfaces

**`/overview` — Workspace Dashboard.** The full categorized analytical view: visibility,
recommendation, citation, sentiment, and competitive sections. Hero KPIs at the top with
delta vs the prior period. Multi-entity trend charts overlay the selected entities. Top
entities table with click-to-expand per-entity drill-down. Topic ownership, risk flags, brand
attributes, head-to-head comparisons, factual claims feed (with Verify / Dispute write
actions), co-mention landscape — every measurement-model signal has a card here.

*Who reads it:* daily by marketers tracking week-over-week movement; weekly by founders for
the headline.

*Key charts:* line chart (trends), bar chart (mentions by platform), radar (multi-dimension),
donut (sentiment, source-type distribution), heatmap (topic × platform).

**`/insights` (BETA) — Narrative Ranking.** A compact summary: hero KPI strip, templated
narrative (*"Acme ranks #2 of 3 with 50% visibility, trailing Canva by 30 pp."*), signal
highlights bullet list, on-demand LLM-authored AI summary (Generate / Regenerate), ranking
table with click-to-expand per-scan trend drill-down per entity.

*Who reads it:* execs / founders who want the one-page read; first stop for a new joiner to
understand a brand's position.

*Key chart:* per-entity per-scan trend (inside the drill-down).

**`/prompts` — Prompt-level analytics.** Per-prompt aggregated metrics: visibility %,
sentiment, position, mention count, models matrix, country, last scan. In-page filters: last N
days, Topic, Models, Lens. Row click opens a drawer with the answer history for that prompt
across scans.

*Who reads it:* content marketers diagnosing which prompts the brand wins or loses on.

**`/sources/domains` and `/sources/urls` — Citation analytics.** Domain- and URL-level
breakdowns. Trend chart at the top; table below. Columns: source, type (Editorial / Forum /
Reviews / Brand-owned), retrieved %, citation rate, retrievals, last seen. Right rail: domain
type breakdown donut.

*Who reads it:* SEO / content marketers tracking earned-media coverage in AI answers; useful
for spotting reputational hot-spots.

**`/competitors` — Competitor ranks.** Cross-tracker competitor view. Per competitor: mention
count, mention rate, recommendation rate, share-of-voice, trend, sentiment. Drill into a
competitor for per-scan detail.

*Who reads it:* product marketing tracking head-to-head movement.

**`/scans` — Scan history.** List of every scan run across the selected trackers. Columns:
started, completed, status (Completed / PartiallyCompleted / Failed), check count, completed
count, failed count. Row click → `/scans/$id/results`.

**`/scans/$scanRunId/*` — Scan detail surfaces.** Per-scan deep dives — results, sources,
topics, topics/$id, competitors, competitors/$id, claims. The Claims surface is where pending
factual claims get marked Verified / Disputed.

### Management surfaces

**`/brands` — Brand inventory.** Workspace brand list. Each row expands to reveal trackers.
Per-row CTAs: open profile, run latest tracker, create tracker.

**`/brands/$brandId/profile` — Brand profile.** A single long form: identity (name, logo,
website, industry, category, positioning, description), aliases (chip editor), products,
audiences, markets, topics, competitors, trust signals. Inline edit with a sticky "Save
changes" pill when dirty. Edits to brand metadata flow through to future scans (the immutable
run principle protects past scan measurements).

**`/brands/$brandId/discovery` — Re-run discovery.** Re-enters the wizard.

**`/brands/$brandId/trackers/new` — Create tracker.** Routes through the ready-to-create
screen → prompt review → schedule → first scan.

**`/brands/$brandId/trackers/$trackerId` — Tracker hub.** Tabbed surface for one tracker:
- **Overview** — compact hero KPI row, signal highlights, top entities with drill-down, AI
  narrative section. Mirrors `/insights` shape but scoped to the one tracker.
- **Schedule** — cadence, timezone, prompt allocation, selected platforms.
- **Prompts** — list with add/remove/edit, regenerate by slice.
- **Lenses** — list of all 6 lenses with active/inactive status; edit link routes to the
  tracker edit screen with `?tab=lenses`.
- **Scans** — scan history for this tracker.

The tracker hub is the only "hub-with-tabs" survivor in the navigation — everywhere else is
flat. Tabs use `?tab=` query state for shareability.

**`/brands/$brandId/trackers/$trackerId/edit` — Tracker edit.** Schedule + platforms + lens
selection + prompt set, on one page.

### Settings stubs

`/settings/workspace` and `/settings/profile` exist as placeholders so the sidebar entries
don't 404. Real settings (billing, members, API keys, integrations) are deferred.

### Charts inventory

The chart library lives in `apps/web/src/components/charts/`:

- **`LineChartWrapper`** — per-entity trends, supports multiple overlaid series.
- **`BarChartWrapper`** — mentions by platform, citation counts by source type.
- **`DonutChartWrapper`** — share distributions (source type, sentiment).
- **`SentimentDonut`** — sentiment-specific donut with semantic coloring.
- **`RadarChartWrapper`** — multi-dimension competitor comparison.
- **`HeatmapWrapper`** — topic × platform matrix.

Every chart wrapper has a story (`*.stories.tsx`) and a test (`*.test.tsx`). The component
manifest (`agent-system/component-manifest.json`) is the canonical inventory.

### Metrics — what each one actually measures

| Metric | Definition | Where it surfaces |
|---|---|---|
| **Queries** | Total scan checks (1 prompt × 1 platform) completed in the window | Hero KPI |
| **Mentions** | Total brand mentions across all answers in the window | Hero KPI |
| **Citations** | Total source citations across all answers | Hero KPI |
| **Brand mention rate** | `mentions / queries` — fraction of answers where the brand appeared | Hero KPI, trend |
| **Brand absence rate** | Fraction of answers with no brand mention AND no owned citation | Hero KPI (diagnostic) |
| **Brand first-mention rate** | Fraction of answers where the brand was named first | Hero KPI (diagnostic) |
| **Visibility (per entity)** | Fraction of in-scope answers mentioning that entity | Top entities, ranking table |
| **Share of voice (per entity)** | That entity's mention count ÷ total mentions in window | Top entities, ranking table |
| **Sentiment (per entity)** | Modal sentiment label across mentions (Positive / Neutral / Negative) | Top entities |
| **Average brand rank** | Average position when mentioned, lower = better | Trend (inverted Y axis) |
| **Owned citation share** | Fraction of citations going to the brand's own domain | Trend, sources |
| **Topic ownership** | Per topic: brand-mentioned prompts ÷ total prompts on topic | Topic ownership card |
| **Co-mentions** | Per competitor: scans where both brand and competitor appeared | Co-mention landscape |
| **Risk flag mentions** | Count of risk-flagged mentions, by flag type and severity | Risk flags card |
| **Brand attribute mentions** | Count per (attribute, polarity) | Brand attributes card |
| **Head-to-head wins/losses** | Per aspect: brand won / lost comparisons | Head-to-head card |
| **Factual claims** | Per-claim subject, asserted value, verifiability, review status | Factual claims feed |

Every metric is reproducible per Scan Run (immutable run principle), per window, per scope
(workspace / brand / tracker), and per platform when relevant.

---

## 10. Architecture in one page

### Frontend

```
apps/web/
  src/
    components/
      atoms/        primitives (Button, Input, Badge, …)
      molecules/    compositions (PageHeader, Tabs, AiNarrativeSection, …)
      organisms/    AppShell, Sidebar, ErrorBoundary
      charts/       LineChartWrapper, BarChartWrapper, DonutChartWrapper, …
    features/
      brands/       brand management
      discovery/    Discovery wizard
      trackers/     tracker hub + edit + creation
      reports/      Workspace Overview, Insights, Prompts, Sources, …
    hooks/          shared hooks (useTrackerScope, useAiNarrative, …)
    api/            HTTP client per resource (claimsApi, insightsApi, …)
    lib/            pure utilities + builders (signalHighlights, entityTrend, …)
    routes/         TanStack Router route tree
    types/api.ts    one canonical file for every API DTO
    content/        user-facing copy as `as const` objects
```

Stack: **React + TypeScript + Vite + TailwindCSS + Storybook + Vitest**. Atomic design with
hard ESLint boundaries: atoms can't import from molecules/organisms/features; molecules can't
import from organisms/features; features can't import from other features. Shared logic moves
to `lib/`, `hooks/`, or `components/molecules/`.

Every component `.tsx` ships with a co-located `.stories.tsx` and `.test.tsx`. The
**component manifest** at `agent-system/component-manifest.json` is the canonical registry —
pre-commit hooks verify every shared `.tsx` has a manifest entry.

State + data: **TanStack Query** for server state, **TanStack Router** for URL state with
`?param=` for shareable filters (tab, trackers, etc.).

### Backend

```
apps/api/
  AIVisibility.Api/             HTTP layer (Controllers, DTOs, Program.cs)
  AIVisibility.Application/     CQRS (Commands, Queries, Handlers via MediatR)
  AIVisibility.Domain/          Entities + value objects + enums (no framework deps)
  AIVisibility.Infrastructure/  EF Core, Migrations, provider clients, DI registration
  AIVisibility.Worker/          Hangfire background jobs (scan execution, analysis)
  AIVisibility.Tests/           xUnit tests
```

Stack: **.NET 8 + MediatR (CQRS) + EF Core + PostgreSQL + Hangfire**. Controllers only
dispatch to MediatR. Handlers do the work. New services register in
`AIVisibility.Infrastructure/DependencyInjection.cs`.

The flow for adding an endpoint is in `agent.md` and `agent-system/CHAINS.md` (chain
`create-endpoint`): DTO → Command/Query → Handler → (Service if needed) → DI registration →
Controller action.

Hangfire attributes (`[AutomaticRetry]`, etc.) go on the **interface method** when jobs are
enqueued through the interface — attributes on the implementation are silently ignored.

### Data layer

PostgreSQL via EF Core. Schema is currently a single living migration (`InitialCreate`) that
gets regenerated as the model evolves — appropriate for pre-release, will switch to additive
migrations at GA.

**Object storage** (deferred) is for raw provider envelopes and crawled page text. Currently
both live in the DB (`ai_answers.raw_response`, `discovery_runs` crawl text).

### AI providers

Six platform clients implement `IPlatformClient`:
- OpenAI (ChatGPT) — default for narrative generation too
- Anthropic (Claude)
- Perplexity
- Microsoft Copilot
- Google Gemini
- xAI Grok

Each client wraps the provider SDK, sends the prompt, and returns `{ Success, Text, Error,
RawEnvelope }`. Per-provider API keys live in `apps/api/AIVisibility.Api/appsettings.Local.json`
for local dev (gitignored).

### Background work

- **Scan execution** — Hangfire fans out one job per `(prompt × platform)`. Today parallel
  across platforms within each prompt; further parallelism deferred.
- **Analysis** — `AnalysisJob` queued automatically on scan completion (Completed /
  PartiallyCompleted), runs the signal extraction pipeline.
- **Scheduled cadence** — Hangfire recurring jobs per tracker per cadence.
- **Scheduled email summaries** — deferred recipient settings + sender wiring.

### Cross-cutting principles

- **Immutable run principle.** Each `ScanRun` snapshots the Tracker config + prompts + platform
  selection so measurement reproducibility survives tracker edits.
- **Event-based operational model.** Lifecycle events for tracker created, scan queued/started/
  completed, prompt run completed/failed, analysis queued/completed. Event schema deferred to a
  future ADR.
- **Data integrity over compat shims.** Pre-release, schema changes drop-and-recreate;
  backward-compat columns are not retained. Once GA hits, additive migrations + dual writes
  become the pattern.

---

## 11. Glossary

| Term | One-line definition |
|---|---|
| **Workspace / Account** | Tenant boundary. One workspace contains many brands. |
| **Brand** | The business/product being tracked. Has a profile, products, audiences, markets, topics, competitors, trust signals. |
| **Visibility Tracker** | The saved setup that measures a brand's AI visibility — cadence, platforms, lenses, prompts. |
| **Coverage mappings** | Internal junction rows on a Tracker — `TrackerTopic`, `TrackerCompetitor`, `TrackerProduct`, `TrackerAudience`, `TrackerMarket`, `TrackerLens`, `TrackerPlatform`. Auto-derived from Discovery. |
| **Visibility Lens** | A category of AI-visibility question. Six are seeded: Discovery, Buying Intent, Competitor Comparison, Sentiment & Trust, Citation Visibility, Content Gaps. |
| **Topic** | A subject the brand wants to measure visibility on. E.g. "Resume builders", "Career advice". |
| **Prompt** | A single AI question. Generated from `Lens × Template × Coverage` or added by the user. |
| **Scan Run** | One execution of a tracker — runs every active prompt against every selected platform. |
| **Scan Check** | One `(prompt × platform)` pair within a Scan Run. Exposed in progress UI as a count, not as an individual concept. |
| **AIAnswer** | The model's response to a Scan Check, including the assistant text + full provider envelope. |
| **AnswerSignal** | Per-answer summary row — did the brand appear, was it recommended, with what certainty. |
| **Mention** | Per-entity record of one brand or competitor appearance in an answer. Carries rank, sentiment, prominence. |
| **Citation** | A source URL the AI cited in an answer. |
| **Source** | The normalized inventory of cited domains/URLs across all answers. |
| **ScanMetric** | Aggregated per-scan numeric measurement. The hero KPIs and trends are projections of ScanMetric rows. |
| **TrendPoint** | Denormalized per-entity time-series row populated when a scan completes. Powers the trend charts. |
| **Finding** | Evidence-backed issue / strength / risk / opportunity identified by analysis. Shipped scaffolding, LLM copy pending. |
| **Content Action** | Recommended next step for a Finding. Shipped scaffolding, LLM copy pending. |
| **Report** | Downloadable / shareable summary of scan results. Manual PDF export shipped; scheduled email summary pending. |
| **Beta** badge | Surfaces that ship before their LLM-authored copy stack lands (Insights, AI narrative). |

For the canonical mapping of user-facing → internal terms, see `01-product-vocabulary.md`.

---

## 12. Read this first — by role

### Engineer (new joiner, day 1)

1. **This guide** — sections 4 (mental model), 5 (Discovery), 7 (Scan execution), 10
   (architecture).
2. **`src/agent.md`** — project conventions, file naming, ESLint boundaries, test patterns.
3. **`agent-system/CHAINS.md`** — recipe-style procedures for every non-trivial change
   (create-endpoint, create-entity, add-feature-page, …).
4. **`agent-system/project-structure.md`** — directory map and pre-commit enforcement.
5. **`agent-system/component-manifest.json`** — the canonical component registry.
6. **`docs/04-consolidated-domain-model.md`** — the entity graph.

Then pick up a small slice — a bugfix or a one-screen feature. The chains tell you the steps;
the manifest tells you whether a component you need already exists. Tests are required, not
optional, and the red→green pattern is the working agreement.

### Marketer (new joiner, day 1)

1. **This guide** — sections 2 (the problem), 3 (differentiation), 4 (mental model), 6 (the
   Lens system), 9 (the page tour).
2. **`docs/01-product-vocabulary.md`** — the words we use in copy, and the ones we avoid.
3. **`apps/web/src/content/`** — the actual UI copy. Every user-facing string in the app is in
   one of these files. Read `discovery.ts` to see how the Discovery wizard is phrased; read
   `app.ts` for the navigation labels; read `brands.ts` and `reports.ts` for the rest.

Then run the product locally (or watch an engineer demo) end-to-end: add a brand → confirm
discovery → create tracker → run scan → walk through Insights / Workspace Overview / per-
tracker hub. Note the language. The product positioning lives at the seam between
*measurement* and *recommendation* — the Findings → Content Actions chain is where the
marketing story lands.

### Sales / Founder / GTM

1. **This guide** — sections 1 (at a glance), 2 (the problem), 3 (differentiation), the
   highlights of section 5 (Discovery is what enables our prompt quality), and section 9 (so
   you can demo confidently).
2. **`docs/00-master-project-brief.md`** — the elevator pitch.
3. **`docs/03-phase-roadmap.md`** — what's shipping and what's deferred. Critical for
   conversations with prospects who ask "do you do X?". The honest answer is sometimes "yes,
   today" and sometimes "not yet, deliberately — here's why".

The differentiation talk track sits in section 3. The "yes we do that / no we don't, here's
the rationale" answers come from sections 1 and the deferred-work list
(`docs/07-deferred-future-work.md`).

---

## Appendix: where to update what

- **Product positioning, vision, scope** → `docs/00-master-project-brief.md`.
- **Vocabulary** → `docs/01-product-vocabulary.md`.
- **User flow** → `docs/02-end-to-end-user-flow.md`.
- **Roadmap / phasing** → `docs/03-phase-roadmap.md`.
- **Domain model** → `docs/04-consolidated-domain-model.md`.
- **Cross-cutting decisions (event model, immutable runs, …)** → `docs/05-cross-cutting-decisions.md`.
- **Master kanban** → `docs/06-master-kanban-plan.md`.
- **Deferred / future work** → `docs/07-deferred-future-work.md`.
- **Agent handoff (for AI-coded changes)** → `docs/08-agent-handoff-instructions.md`.
- **Navigation + page specs** → `docs/10-navigation-and-pages-plan.md`.
- **Onboarding (this doc)** → `docs/11-onboarding-guide.md`.

When the product changes, update this guide last — every other doc is the source of truth for
its own area. This guide is a synthesis, not a primary source.
