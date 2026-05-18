# KANBAN-001 — Discovery Board Seed

This Kanban board is generated from ADR-001 and REQ-001. It is intended for detailed execution planning by humans, Codex, or other agents.

## Epic 1 — Discovery UX

### TODO

- Design Add Brand screen
- Design combined Discovery confirmation screen
- Add grouped sections: Brand details, Products/services, Audience, Market, Topics, Competitors, Trust signals
- Add inline edit/select/unselect/add behavior
- Add confidence/uncertainty copy without exposing raw technical scores by default
- Add manual fallback flow when crawl fails
- Add Discovery completion validation

### Acceptance criteria

- User can complete Discovery from one combined confirmation screen
- User must review the screen before proceeding
- High-confidence suggestions can be preselected
- User can edit or add missing values

## Epic 2 — Website Crawl

### TODO

- Implement same-domain crawl with max 25 pages
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
- Extract topics from headings, page titles, URLs, FAQ, repeated phrases
- Suggest generic/industry topics
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

- Implement finite TrustSignal taxonomy
- Detect pricing/refund/cancellation/support/privacy/security/reviews/testimonials/case study signals
- Track Detected vs NotDetected
- Store source evidence

### Acceptance criteria

- System never claims a trust signal is missing, only not detected on crawled pages
- TrustSignals support later sentiment/trust prompts and findings

## Epic 10 — Confidence, Normalization, and Confirmation

### TODO

- Implement configurable concept-specific thresholds
- Implement source/status/confidence metadata on extracted candidates
- Implement alias-based soft normalization
- Implement suggested merge UX/backend flagging
- Ensure user confirmation finalizes value

### Acceptance criteria

- Default thresholds match ADR-001
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
