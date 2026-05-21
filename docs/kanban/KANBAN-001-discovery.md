# KANBAN-001 — Discovery Board Seed

This Kanban board is generated from ADR-001 and REQ-001. It is intended for detailed execution planning by humans, Codex, or other agents.

## Epic 1 — Discovery UX

### TODO

- Design Add Brand screen
- Design Discovery confirmation wizard (Brand Identity → Products → Audiences & Markets → Competitive Landscape → Review & Confirm)
- Implement the combined, editable Review & Confirm step (with per-section "Edit" jump-back)
- Add inline edit/select/unselect/add behavior
- Add in-wizard refinement: re-derive Topics/Competitors after Audiences & Markets; per-lens "Refresh suggestions" (max 3 per lens)
- Add confidence/uncertainty copy without exposing raw technical scores by default
- Add manual fallback flow when crawl fails
- Add Discovery completion validation

### Acceptance criteria

- User can complete Discovery through the confirmation wizard, ending in a combined Review & Confirm step
- User must reach the Review & Confirm step before completing
- High-confidence suggestions are preselected
- User can edit or add missing values

## Epic 2 — Website Crawl

### TODO

- Implement same-domain crawl with max 10 pages
- Prioritize homepage/about/product/service/pricing/FAQ/support/contact/sitemap pages
- Implement retry behavior
- Implement failure handling and manual fallback
- Store crawl snapshot metadata
- Store extracted page text in object storage
- Store structured extraction in DB

### Acceptance criteria

- Crawl does not block onboarding if it fails
- Crawl output is traceable to source pages
- Crawl stays within v1 scope and does not perform SEO audit

## Epic 3 — BrandProfile Extraction

### TODO

- Extract BrandName validation signals
- Extract ShortDescription
- Extract Industry
- Extract Category
- Extract Positioning
- Attach confidence/source metadata
- Remove ToneOfVoice and PrimaryOfferingSummary from v1

### Acceptance criteria

- BrandName and WebsiteUrl are confirmed
- Brand description/industry/category suggestions are generated where possible
- Low-confidence values require user attention

## Epic 4 — Product / Service Extraction

### TODO

- Extract products/services from navigation, page titles, headings, sitemap, pricing/product pages
- Add ProductType classification
- Add category fallback if no product/service found
- Support user-added products/services

### Acceptance criteria

- At least Product/Service or Category exists before Discovery completion
- Extracted products/services can be confirmed or ignored

## Epic 5 — Audience Extraction

### TODO

- Extract audience phrases from copy, solution pages, testimonials, case studies
- Suggest likely audiences from industry/category templates
- Keep Audience optional
- Support user-added audience values

### Acceptance criteria

- Missing audience does not block Discovery
- Audience suggestions do not become trusted until confirmed/preselected and reviewed

## Epic 6 — Market Model

### TODO

- Implement Market entity with normalized + custom support
- Add country/language/currency reference TODO placeholders
- Extract market signals from contact/footer/currency/hreflang/TLD/schema
- Require user confirmation

### Acceptance criteria

- Market is required for Discovery completion
- Custom market can be created
- User can override inferred market

## Epic 7 — Topic Extraction

### TODO

- Rename Theme to Topic everywhere in Phase 1 docs/code
- Generate topics during the confirmation wizard from confirmed context (industry/category, products, audiences, markets) via the resuggest/regenerate-lens flow — not from the initial crawl
- Add alias-based soft normalization
- Support user-added free-form topics

### Acceptance criteria

- At least one Topic exists before Discovery completion
- Topics remain user-editable and not rigid taxonomy-bound

## Epic 8 — Competitor Discovery

### TODO

- Add user-provided competitor input
- Add search + LLM competitor suggestion mechanism
- Add LLM-only fallback
- Use website crawl competitor mentions only as supplemental signal
- Always require user confirmation

### Acceptance criteria

- Competitors are optional
- Competitor suggestions are clearly marked as suggestions
- No competitor selection does not block Discovery

## Epic 9 — Trust Signals

### TODO

- Implement the finite TrustSignal taxonomy (7 curated categories): Awards & Recognitions, Certifications & Accreditations, Press & Media Mentions, Testimonials & Reviews, Expert Endorsements, Case Studies & Success Metrics, Client & Partner Logos
- Detect signals across the 7 categories
- Track via the standard candidate lifecycle (Suggested → Confirmed/Dismissed); no separate NotDetected status
- Require a signal type when the user adds a custom trust signal
- Store source evidence

### Acceptance criteria

- Undetected signals produce no candidate (the system never fabricates a "missing" claim)
- TrustSignals support later sentiment/trust prompts and findings

## Epic 10 — Confidence, Normalization, and Confirmation

### TODO

- Implement uniform confidence thresholds (High >= 0.70, Medium >= 0.40, Low < 0.40)
- Preselect high-confidence candidates in every lens
- Implement source/status/confidence metadata on extracted candidates
- Implement alias-based soft normalization
- Implement suggested merge UX/backend flagging
- Ensure user confirmation finalizes value

### Acceptance criteria

- Thresholds match REQ-001 §14 (uniform High/Medium/Low)
- User-created items are not aggressively auto-merged
- Confirmed values are not overwritten automatically

## Epic 11 — Re-discovery

### TODO

- Add rerun Discovery action
- Store new crawl snapshot
- Diff new suggestions against confirmed values
- Present changes as suggestions
- Prevent automatic overwrite of confirmed values

### Acceptance criteria

- Re-discovery is safe and non-destructive
- User chooses which changes to accept

## Epic 12 — Phase 1 to Phase 2 Contract

### TODO

- Produce confirmed Discovery output object/query
- Ensure output includes BrandProfile, Market, Products/Category, Topics, Competitors, Audiences, TrustSignals
- Include crawl snapshot references and confirmation metadata

### Acceptance criteria

- Phase 2 can create a Visibility Tracker from confirmed Discovery outputs
- Phase 2 does not need to rerun crawl or infer Discovery concepts again

## Added after the seed — Brand aliases

Not in the original ADR-001 / REQ-001. Alternate brand names ("also known as") captured for downstream brand-mention detection in the reporting/analytics phase.

- ✅ **Done.** Stored on `Brand.Aliases` (jsonb), user-entered on the Brand Identity step via an add/remove chip editor, shown read-only in Review & Confirm, and persisted on completion (trimmed + case-insensitive dedupe). Migration `AddBrandAliases`.

## Known gaps / Phase 1 backlog (implementation does not yet meet spec)

Tracked deviations where the shipped code does not yet satisfy REQ-001 / ADR-001. B1 is resolved; B2–B7 remain open. See `../addendum/ADDENDUM-002-discovery-implementation-alignment.md` for context.

- **B1 — Completion gating (§16): ✅ DONE.** `ConfirmDiscoveryCommandHandler` requires at least one confirmed Market, at least one Topic, and (at least one Product/Service or a brand Category) before the run can complete; the wizard disables "Confirm & Finish" and lists what is missing.
- **B2 — Source evidence (§5, §7):** Only TrustSignal stores source page URLs; Product has a single `RelatedPageUrl` (not populated by the LLM path); Audience/Market/Topic/Competitor/BrandProfile store none.
- **B3 — Crawl richness (§4):** Open Graph and schema.org metadata are not collected; no sitemap-driven page discovery.
- **B4 — Crawl resilience (§4):** No crawl retry; a full crawl failure fails the run (the frontend offers a manual-fallback UI, but there is no backend retry).
- **B5 — Normalization (§15):** No alias-based soft normalization or suggested-merge logic; the `Topic.AliasesJson` column exists but is unused.
- **B6 — Re-discovery (§17):** Re-running discovery overwrites; there is no new-snapshot diff against confirmed values (non-destructive rerun).
- **B7 — Market reference data (§10):** No country/language/currency lookup or validation; values are freeform strings.
