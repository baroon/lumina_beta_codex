# ADDENDUM-002: Discovery Implementation Alignment

**Date:** 2026-05-21
**Context:** Phase 1 (Discovery) shipped with several deliberate deviations from ADR-001. This addendum records those deviations so the locked ADR stays accurate-by-reference. ADR-001 itself is unchanged; the sections below supersede the corresponding parts of it.
**Participants:** Product owner + implementation agent

---

## Summary

ADR-001 — Discovery Model is Accepted / Locked. During Phase 1 implementation, three of its decisions evolved and were intentionally changed in the shipped product. This addendum captures each change, the reasoning, and the ADR-001 section it supersedes. It also notes one open gap where the implementation does not yet satisfy ADR-001.

The companion specification docs have been updated to match the implementation:

- `requirements/REQ-001-discovery.md` (§6, §8, §13, §14)
- `kanban/KANBAN-001-discovery.md` (Epics 1, 9, 10)
- `02-end-to-end-user-flow.md` (Phase 1 steps)

---

## Changes

### 1. Confirmation screen: single combined screen → multi-step wizard

**Supersedes:** ADR-001 "Decision summary", "User-facing flow" (steps referencing "one combined screen").

**Original:** A single combined Discovery confirmation screen with grouped sections and inline editing.

**Changed to:** A guided multi-step wizard whose final step is a combined, editable review:

```text
1. Brand Identity        — brand profile fields, each with per-field source attribution, inline editable
2. Products              — products / services
3. Audiences & Markets   — target audiences and markets
4. Competitive Landscape — topics, competitors, trust signals
5. Review & Confirm      — combined summary of all sections; "Edit" jumps back to the relevant step
```

The wizard also adds **in-wizard refinement** (distinct from full re-discovery):

```text
Resuggest    — advancing past Audiences & Markets re-derives Topics and Competitors
               from the confirmed products, audiences, and markets.
Refresh lens — each lens offers a "Refresh suggestions" action that regenerates that
               lens, limited to 3 refreshes per lens.
```

**Reasoning:** A single dense screen overwhelmed users with seven concept groups at once. Stepwise progression keeps each decision focused, and re-deriving topics/competitors from the user's confirmed inputs produces materially better suggestions. The combined review step preserves ADR-001's "review once before completing" intent.

---

### 2. TrustSignal taxonomy: 14-item list → 7 curated categories

**Supersedes:** ADR-001 "Concept: TrustSignal" (the "Suggested v1 TrustSignal types" and "Status values" blocks).

**Original:** 14 signal types (Pricing Transparency, Refund Policy, Cancellation Policy, Customer Support, Privacy Policy, Security, Compliance/Certifications, Reviews/Ratings, Testimonials, Case Studies, Guarantee/Warranty, Contact Availability, Company/About Information, Terms of Service), with status values `Detected` / `NotDetected` / `UserConfirmed` / `UserDismissed`.

**Changed to:** 7 curated categories (enum name in parentheses):

```text
Awards & Recognitions          (AwardsAndRecognitions)
Certifications & Accreditations (CertificationsAndAccreditations)
Press & Media Mentions         (PressAndMediaMentions)
Testimonials & Reviews         (TestimonialsAndReviews)
Expert Endorsements            (ExpertEndorsements)
Case Studies & Success Metrics (CaseStudiesAndSuccessMetrics)
Client & Partner Logos         (ClientAndPartnerLogos)
```

TrustSignals now follow the same candidate lifecycle as every other concept (`Suggested` → `Confirmed` / `Dismissed`); there is no separate `NotDetected` status. An undetected signal simply produces no candidate. When a user adds a custom trust signal, a signal type from the list above must be selected.

**Reasoning:** The original list mixed trust signals with policy/legal pages (Refund Policy, Terms of Service), which are better modeled elsewhere. The 7 curated categories are the externally verifiable trust elements that actually influence AI sentiment and citation behavior. Folding trust signals into the shared candidate lifecycle removes a bespoke status model and the "not detected" claim — the system stays silent rather than asserting absence.

---

### 3. Confidence policy: per-concept thresholds → uniform thresholds

**Supersedes:** ADR-001 "Confidence policy" (the per-concept "Default thresholds" block).

**Original:** Configurable, concept-specific thresholds (BrandProfile 0.80, Product/Service 0.75, Audience 0.70, Market user-confirm, Topic 0.65, Competitor user-confirm, TrustSignal 0.75).

**Changed to:** One uniform set of thresholds mapping every candidate to a confidence level:

```text
High:   confidence >= 0.70   (preselected in every lens)
Medium: confidence >= 0.40 and < 0.70
Low:    confidence < 0.40
```

High-confidence candidates are preselected in all lenses (including Market and Competitor); medium/low are shown but not preselected. User confirmation or deselection finalizes the item regardless of original confidence.

**Reasoning:** Per-concept tuning added complexity with no demonstrated benefit at this stage. A single threshold for the "High = preselected" rule is predictable for users and trivial to reason about. It is defined once in `apps/web/src/features/discovery/confidence.ts`.

---

### 4. Extraction model: single pass → staged, context-propagating pipeline

**Supersedes:** ADR-001 "Extracted concepts" and the per-concept extraction descriptions (the implication that one extraction pass yields all seven concepts).

**Original:** The crawl/extraction pipeline produces candidates for all seven concepts at once (BrandProfile, Product/Service, Audience, Market, Topic, Competitor, TrustSignal).

**Changed to:** A staged model:

```text
Initial crawl extraction → BrandProfile, Products, Audiences, Markets, TrustSignals
Confirmation wizard      → Topics and Competitors, generated from the user's confirmed
                           industry/category, products, audiences, and markets
```

`resuggest` generates Topics and Competitors from confirmed context; `regenerate-lens` can additionally regenerate any single lens (any of the six) using all confirmed fields.

**Reasoning:** Topics and competitors are far more accurate when conditioned on the user's confirmed foundations than when guessed from raw crawl text. Deferring them makes confirmation an active input to generation rather than a passive review. Implemented in `LlmContentExtractor.cs` (initial) and `OpenAiResuggestService.cs` (staged), wired through `resuggest` / `regenerate-lens`.

---

### 5. Topic: `TopicType` field removed

**Supersedes:** ADR-001 "Concept: Topic" (the `TopicType` field).

**Original:** Topic had an optional `TopicType` field.

**Changed to:** `TopicType` removed (migration `RemoveTopicType`). Topics carry `Name`, `Description`, `Source`, `Confidence`, `Status`, and `Aliases` only.

**Reasoning:** TopicType added taxonomy overhead with no consumer in Phase 1; topics are free-form and lightly aliased.

---

### 6. Crawl page cap: 25 → 10

**Supersedes:** ADR-001 "Website crawl scope" (Max pages: 25).

**Original:** Max 25 same-domain pages.

**Changed to:** Max 10 same-domain pages (`WebsiteDiscoveryService.cs`, `MaxPages = 10`), plus a wall-clock deadline on the crawl loop.

**Reasoning:** 10 prioritized pages (homepage, about, product/pricing, etc.) cover the brand-understanding need at lower latency and cost for the near-instant discovery experience.

---

### 7. AI provider: multi-provider → OpenAI only

**Supersedes:** the ADR-001 / ARCH-007 expectation of a multi-provider adapter for discovery.

**Original:** Adapter pattern across providers; Anthropic was used for competitor suggestions.

**Changed to:** All discovery LLM tasks run on OpenAI (`gpt-4o-mini`). The Anthropic competitor service remains in the codebase but is **not registered in DI** ("kept for reference, no longer used").

**Reasoning:** Consolidating on one provider simplified prompt tuning during Phase 1. The Anthropic adapter is retained as reference/dead code; revisit if multi-provider discovery is needed.

---

## Known gaps / Phase 1 backlog (implementation does NOT yet meet spec)

These are deviations where the shipped code does not satisfy REQ-001 / ADR-001. They are recorded as backlog to be fixed in code, **not** as spec changes. Mirrored in `../kanban/KANBAN-001-discovery.md` "Known gaps / Phase 1 backlog".

- **B1 — Completion gating (ADR-001 "Discovery completion criteria", REQ-001 §16):** `ConfirmDiscoveryCommandHandler` marked the run `Completed` regardless of selections. **Fix in progress:** require at least one confirmed Market, at least one confirmed Topic, and (at least one confirmed Product/Service or a brand Category) before completion.
- **B2 — Source evidence (§5, §7):** Only TrustSignal stores source page URLs; Product has a single `RelatedPageUrl` not populated by the LLM path; Audience/Market/Topic/Competitor/BrandProfile store none.
- **B3 — Crawl richness (§4):** No Open Graph or schema.org collection; no sitemap-driven page discovery.
- **B4 — Crawl resilience (§4):** No crawl retry; a full crawl failure fails the run (the frontend offers a manual-fallback UI; there is no backend retry).
- **B5 — Normalization (§15):** No alias/merge/dedupe logic; `Topic.AliasesJson` exists but is unused.
- **B6 — Re-discovery (§17):** Re-runs overwrite; there is no non-destructive snapshot diff against confirmed values.
- **B7 — Market reference data (§10):** No country/language/currency lookups or validation; values are freeform strings.

---

## Status

Accepted. Supersedes the named sections of ADR-001 for Phase 1 as shipped. Open items are tracked above under "Known gaps / Phase 1 backlog".
