# Deferred and Future Work

## Product features deferred

- Focus Areas as ongoing improvement initiatives
- Content Briefs
- Full content generation
- Workflow engine
- CMS publishing
- Social publishing
- Approval flows
- GSC/GA4/SEO tool integrations
- Agency/client portal
- White-label reports
- Advanced pricing/plans

## Taxonomies/TODOs

- Industry taxonomy
- Category taxonomy under industry
- Market reference data: countries, languages, currencies, common business regions
- Source type taxonomy and normalization rules
- Generic Topic suggestions
- Industry-specific Topic packs
- TrustSignal taxonomy
- Prompt Library and prompt packs
- Known domain/source classification list

## Architecture TODOs

- Event taxonomy and payload schema
- Audit log schema
- Operational metrics schema
- Event retention policy
- Monitoring dashboards/alerts
- Consolidated API contract
- Consolidated authorization model
- Data retention/deletion policy
- **Unique constraint on `Brand (WorkspaceId, Name)`** — today nothing prevents the same brand name being added twice to a workspace (we have seen the "Nostri × 3" duplication in dev). The discovery-summary handler and the BrandSelector both paper over this with name-based dedup, and the tracker dropdowns now show the same brand section twice when duplicates exist. Add a case-insensitive unique index in EF + a migration; decide on the upsert path (most likely: discovery should reuse an existing Brand row for the workspace rather than insert a new one). Until the constraint lands, keep the FE dedup as a safety net.
- **Hard-delete Draft prompts in `RemovePromptCommand`** — today the handler always soft-archives (status → Archived, ArchivedAt set), even when the prompt has zero PromptRun history. During initial tracker setup this leaves Archived rows in `prompts` alongside the Active rows after confirm, which surprised the user. Fix: detect `prompt_runs.PromptId == id`; with 0 runs, hard-DELETE (cascade the five M:N rows — PromptTopic, PromptProduct, PromptMarket, PromptAudience, PromptCompetitor); with ≥1 runs, keep today's soft-archive so Mention / Citation history stays attributable. Verify each M:N config has `OnDelete(Cascade)` on the Prompt FK before shipping — write a quick test that creates a Draft prompt with all five M:N rows, removes it, and asserts the prompt + dependents are gone.
- **PromptTemplate language support** — today PromptTemplate.TemplateText is implicitly English; Market and Prompt carry no language. When non-English markets ship, add `LanguageCode` to PromptTemplate (one row per phrasing per language), `TemplateGroupId` (or stable `Code`) so translations of the same template group for analytics, and `LanguageCode` on Market. Generator picks templates whose language matches the Market; falls back to `en` if no translation exists. Storing localized templates beats runtime translation because deterministic prompt text is what makes week-over-week trend comparability meaningful.

## Analytics deferred

- Visibility Score
- Blended Visibility
- Recommendation Quality
- Citation Quality
- Platform Drift
- Retrieval Rate
- Complex leaderboards
- Benchmarking against industry/category
