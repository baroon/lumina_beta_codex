# KANBAN-004: Reporting & Actions UI

## Backlog

### Product / UX

- Define Scan Results wireframe
- Define Finding card component
- Define Content Action card component
- Define Prompt Evidence table and answer drawer
- Define Tracker dashboard wireframe
- Define Topic view wireframe
- Define Competitor view wireframe
- Define Source/Citation view wireframe
- Define PDF report layout
- Define scheduled email template
- Define status and empty-state copy

### Backend / API

- Create ScanResultsSummary query/API
- Create CoreMetrics view model
- Create FindingCard API response
- Create ContentActionCard API response
- Create PromptEvidenceRow query/API
- Create SourceCitationRow query/API
- Create TopicPerformanceRow query/API
- Create CompetitorPerformanceRow query/API
- Add PDF report generation endpoint
- Add report generation status tracking
- Add scheduled email summary payload builder

### Frontend

- Build Scan Results page shell
- Build Scan Summary header
- Build Top Findings section
- Build Recommended Content Actions section
- Build Core Metrics row
- Build Visibility by Platform chart
- Build Visibility by Topic chart
- Build Share of Voice chart
- Build Sentiment Distribution chart
- Build Top Cited Sources chart
- Build Prompt Evidence table
- Build Full AI Answer drawer
- Build Tracker Dashboard page
- Build Recent Scan Runs table
- Build Topic table/detail page
- Build Competitor table/empty state
- Build Source/Citation table/detail page
- Build PDF export trigger UI
- Build status banners for partial/failed/cancelled scans
- Build empty states

### Reporting / Export

- Implement manual PDF export
- Create PDF report template
- Add report metadata section
- Add executive summary section
- Add top findings and actions sections
- Add metrics/charts sections
- Add prompt evidence appendix
- Store generated report artifact
- Add download link

### Email

- Create scheduled scan email template
- Add completed scan email state
- Add partial scan email state
- Add failed scan email state
- Link email CTA to scan results
- Ensure configured tracker notification recipients are used

### QA / Validation

- Test completed scan results page
- Test partially completed scan warning
- Test failed scan empty/error state
- Test no competitors empty state
- Test no citations empty state
- Test no trend history state
- Test Finding card evidence navigation
- Test Content Action card detail view
- Test PDF generation
- Test scheduled email rendering

## Ready for Development

- Scan Results page API/view model contracts
- Finding card UI
- Content Action card UI
- Prompt Evidence table
- Core metrics row
- Breakdown charts
- Status/empty states

## In Progress

_Nothing in progress right now._

## Done

### `/prompts` baseline (pre-2026-06-15)

- `GET /api/workspaces/{id}/prompts` aggregating endpoint wired (`useWorkspacePrompts`).
- `PromptsScreen` + `PromptsTable` shell with columns: Prompt · Topics · Tracker · Visibility (with first-mention position) · Sentiment · Mentions · Activity (last-scan + platforms inline).
- `?trackers=` scope respected via `useTrackerScope`.
- Pre-Phase-1 search filter (`filterRows`) over text / lens / topic / tracker / brand.
- Inline edit + per-row remove (`useUpdateWorkspacePrompt`, `useRemoveWorkspacePrompt`).
- Empty state when the workspace has no in-scope prompts.

### `/prompts` Phase 1 reskin (commit `939ea83`, 2026-06-15)

- Lens-chip row (filter + section-anchor), status strip (4 KPI tiles + lens-distribution donut + visibility-distribution histogram), sortable columns (visibility / mentions / activity), section-per-lens layout via `MetricCategoryLayout`, Topics filter via `FiltersPopover` + `TopicSelector`, Models (platform) filter inside the same popover (inline `PlatformChipFilter`, derived from `platformCodes` on the row + a `PLATFORM_LABELS` lookup), date-range picker in the page header.
- Pure helpers exported for test: `filterRows`, `sortPrompts`, `deriveSummary`.
- `InfoTooltip` (with one-liner copy) on every summary tile + chart card to match the Workspace Overview affordance.

### `/prompts` Phase 2 — Products / Markets / Audiences filters + Country column (2026-06-15)

- BE: `WorkspacePromptRowDto` extended with `Products`, `Audiences`, `Markets`, `MarketCountryCodes`. `GetWorkspacePromptsQueryHandler` extended with three M:N join blocks (mirroring the existing `PromptTopics` block) + a country-code derivation that drops null/empty codes. BE tests **504/504 pass** (handler test extended to assert the new fields + new `DimensionListsAreEmpty_WhenPromptHasNoAttribution` covers the no-attribution case).
- FE: TS `WorkspacePromptRowDto` interface updated. Three new popover rows (`Products & Services`, `Markets`, `Audiences`) wired into the existing `FiltersPopover` reusing the pre-existing `ProductSelector` / `MarketSelector` / `AudienceSelector` molecules + `useProductCounts` / `useMarketCounts` / `useAudienceCounts` hooks (sourced from `discoverySummary.{products,markets,audiences}`). `activeFilterCount` + "Clear all" updated to span the new filters.
- FE: Country column added between Topics and Tracker in the prompts table. Renders one flagcdn SVG `<img>` per ISO-3166 alpha-2 code via a new shared `@/lib/flag` helper. The helper was moved out of `features/discovery/flag` to clear the feature-isolation lint boundary; both discovery callers updated, old file + test deleted, test migrated to `lib/`.
- FE tests **951/951 pass**, typecheck clean. New integration test for the Markets filter end-to-end (mocked `useDiscoverySummary` with two markets, exercising opt-out selector semantics); new test asserts flag images render in the Country column with em-dash fallback for empty.
