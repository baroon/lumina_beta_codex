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

### `/prompts` Phase 1 reskin (2026-06-15)

- `PromptsScreen.tsx` + `PromptsScreen.test.tsx` modified, **uncommitted on `main`**.
- Adds: lens-chip row (filter + section-anchor), status strip (4 KPI tiles + lens-distribution donut + visibility histogram), sortable columns (visibility / mentions / activity), section-per-lens layout via `MetricCategoryLayout`, Topics filter via `FiltersPopover` + `TopicSelector`, Models (platform) filter inside the same popover (inline `PlatformChipFilter`, derived from `platformCodes` on the row + a `PLATFORM_LABELS` lookup), date-range picker in the page header.
- Pure helpers exported for test: `filterRows`, `sortPrompts`, `deriveSummary`.
- Tests: 23/23 green for `PromptsScreen.test.tsx`; full web suite 948/948 (`pnpm test`).
- Sibling deps verified on disk: `LensChipRow`, `MetricCategoryLayout`, `CollapsibleCard`, `FiltersPopover`, `TopicSelector`, `DonutChartWrapper`, `BarChartWrapper`, `useDiscoverySummary`, `useTopicCounts`, `content/lenses`.
- Deferred to Phase 2 (per docstring in `PromptsScreen.tsx`): Products / Markets / Audiences filters (need BE-side lookup on the row); per-prompt drill-down drawer (needs a per-prompt scan-history endpoint).
- Deltas vs. `docs/10-navigation-and-pages-plan.md` §`/prompts` still open: Models matrix column (the row exposes a ran/didn't-run list, not per-platform metrics — a true matrix needs BE), Tags column, Country column, and row-click answer-history drawer.

## Done

### `/prompts` baseline (pre-2026-06-15)

- `GET /api/workspaces/{id}/prompts` aggregating endpoint wired (`useWorkspacePrompts`).
- `PromptsScreen` + `PromptsTable` shell with columns: Prompt · Topics · Tracker · Visibility (with first-mention position) · Sentiment · Mentions · Activity (last-scan + platforms inline).
- `?trackers=` scope respected via `useTrackerScope`.
- Pre-Phase-1 search filter (`filterRows`) over text / lens / topic / tracker / brand.
- Inline edit + per-row remove (`useUpdateWorkspacePrompt`, `useRemoveWorkspacePrompt`).
- Empty state when the workspace has no in-scope prompts.
