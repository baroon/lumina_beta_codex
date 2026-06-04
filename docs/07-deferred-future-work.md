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
- **ScanExecutor parallelism — current loop is fully sequential.** Each `(prompt × platform)` iteration runs serially, taking ~6 s (≈ 3 s primary LLM call + ≈ 3 s inline extraction call). Wall-clock scales linearly with `scan_check_count`, so 30 prompts × 4 platforms = ~12 min and 100 × 6 = ~60 min. The Daily-cadence Hangfire run doesn't care, but the post-onboarding live "Activate → first scan" screen feels broken past ~3 min. Three levers in order of return-on-effort: (1) parallel across platforms within each prompt — each provider has its own rate-limit bucket, so essentially free; needs a `DbContext` per concurrent iteration. ~Nx speedup at N platforms with no rate-limit risk. (2) decouple extraction from the scan loop — extract per-answer becomes its own Hangfire job; cuts the per-iteration wall-clock roughly in half but the live-counter UX needs an "Analyzing…" state because mentions land after the prompt_run flips Completed. (3) parallel across prompts on the same platform — biggest speedup but provider RPM limits start to matter (OpenAI dev tier is ~3 RPM); needs a per-provider token-bucket + back-off layer. Build (1) first; (2) and (3) stack on top.
- **`ai_answers.raw_response` should store the provider's full JSON envelope, not a copy of the assistant text.** Today every platform client extracts the assistant message and stores it in *both* `answer_text` and `raw_response`. The column was originally intended to keep the full envelope (token counts, `finish_reason`, model version, system fingerprint, tool-call traces, safety flags) so future debugging could audit what the provider actually returned vs. what we parsed. Fix is small: in each `*PlatformClient` (Open AI, Anthropic, Gemini, Grok, Perplexity, Copilot) keep the deserialized envelope and serialize it back to JSON for `raw_response`. Useful the first time a scan produces surprising signal extraction and you want to know whether the provider tool-called, hit a safety filter, or got truncated.

## Analytics deferred

- Visibility Score
- Blended Visibility
- Recommendation Quality
- Citation Quality
- Platform Drift
- Retrieval Rate
- Complex leaderboards
- Benchmarking against industry/category
