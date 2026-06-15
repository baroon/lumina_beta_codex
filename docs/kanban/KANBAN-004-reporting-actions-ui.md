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

### `/prompts` Phase 3 — Per-prompt answer-history drawer (2026-06-15)

- BE: new query `GetPromptAnswerHistoryQuery(PromptId, From, To)` returning `PromptAnswerHistoryDto { promptId, promptText, from, to, answers[] }`. Each `PromptAnswerRowDto` rolls the tracker-brand mentions onto the row: `BrandMentionCount` (sum), `DominantSentiment` (mode, ordinal tie-break), `FirstMentionPosition` (min), `EvidenceSnippet` (first non-empty). Cross-brand mentions on the same answer (competitors, products) are filtered out so the row reflects only the tracked brand.
- BE: new endpoint `GET /api/prompts/{promptId}/answers?from=&to=` on `WorkspacePromptsController`. Authorization is workspace-scoped inside the handler — prompts whose tracker brand isn't in the caller's workspace return an empty payload (`promptText=""`, `answers=[]`) with a 200, not a 404, so the FE renders a dedicated "not in scope" state without branching on errors.
- BE tests **509/509 pass**. New `GetPromptAnswerHistoryQueryHandlerTests` covers: per-answer brand-mention rollup with cross-brand filtering, newest-first ordering, window exclusion, foreign-workspace authorization (`ForeignWorkspacePrompt_ReturnsEmptyResultWithoutLeakingText`), unknown prompt id.
- FE: new TS `PromptAnswerHistoryDto` + `PromptAnswerRowDto`, new `promptsApi.answerHistory` + `usePromptAnswerHistory` hook (query disabled when `promptId` is null so the caller can pass the closed-drawer state straight through). `promptsApi.test.ts` extended.
- FE: new `PromptAnswerHistoryDrawer` molecule (Radix Dialog, right-slide) modeled on `SourceCitationsDrawer`. Each answer card surfaces platform badge, relative scan timestamp, sentiment badge / mention count / position chip (or a "Brand not mentioned" cue when count = 0), evidence snippet on a tinted bar, and the full answer text. Loading skeleton, error message, in-scope empty ("No answers in window"), and foreign-workspace empty ("This prompt is not in the current workspace scope") are all distinct branches.
- FE: row click on `PromptsScreen` opens the drawer for that prompt. The InlineEdit cell and the Remove button each stop propagation so editing or removing a prompt does NOT also open the drawer. New copy section `REPORTS_COPY.prompts.answerDrawer`. Component manifest gained the new drawer entry.
- FE tests **961/961 pass**, typecheck clean. New `PromptAnswerHistoryDrawer.test.tsx` (7 tests: closed / open / singular-vs-plural mention chip / in-scope empty / not-in-scope / error / close button). New `PromptsScreen` tests: row click opens drawer; Remove button stops propagation so the drawer doesn't open alongside the delete.

### `/prompts` layout fixes — double scrollbar + URL hash (commits `1434569` + `c5f7f41`, 2026-06-15)

- Recharts injects a hidden measurement `<span>` into `<body>` at `position: absolute; top: -20000px` to size tick labels. Because that span is a sibling of `#root`, AppShell's own `overflow-hidden` didn't contain it, the document scroll area grew, and the browser drew a phantom scrollbar alongside `<main>`'s real one. Locking `html` + `body` overflow in `index.css` catches sibling-of-`#root` injections; AppShell also gained `overflow-hidden` + `min-h-0` as belt-and-braces; `[scrollbar-gutter:stable]` on `<main>` was dropped (it was an earlier red-herring fix that rendered as a visible track on Windows native scrollbars).
- `MetricCategoryLayout` outbound URL-hash mirroring disabled (commit `c5f7f41`). When it was on, every `IntersectionObserver` tick wrote via `history.replaceState`, and on /prompts that produced a visible mid-scroll snap-back. Inbound deep links (`/prompts#BuyingIntent`) still resolve via the `useState` lazy-init that reads the hash on mount.
- 961/961 tests pass.

### `/prompts` Phase 4 — Sentiment filter + FiltersPopover compaction (commit `6dbd1a8`, 2026-06-15)

- New **Sentiment filter** inside `FiltersPopover` — FE-only, intersected against the row's `dominantSentiment` in the existing `useMemo` chain. New `SENTIMENT_ORDER` constant + `SentimentChipFilter` inline component mirroring `PlatformChipFilter`.
- Inline chip filters (Models, Sentiment) picked up the **LensChipRow-style UX** from `/overview`: empty selection visually shows every chip pressed, first click narrows, subsequent clicks add to the selection (multi-select), clicking an already-selected chip is a no-op (don't-unselect rule), per-row "Clear" link appears once you've started selecting.
- **Popover compaction** (both `/prompts` and `/overview`): the four trigger-pill selectors (Topics / Products & Services / Markets / Audiences) now float together in a single flex-wrap group — each pill already names its dimension + count, so per-row labels and dividers were just repeating the same info. Models / Sentiment / Trust signals keep their labelled rows since their chips show individual values.
- Visual polish: thin top-border divider on each labelled row, tighter vertical padding (`py-1` + no outer `space-y`), uniform primary-tinted pressed state across both inline chip rows (Sentiment dropped its green/amber sentiment-specific colors in favor of the same purple as Models).
- 963/963 tests pass.

### `/prompts` — still owed (parked, needs BE)

- **Per-platform Models matrix column** — today the row only exposes ran/didn't-run via `platformCodes`. A real matrix needs per-platform visibility / mention / sentiment columns from the BE.
- **Tags column** — no `Tag` domain object exists; would need a new dim with tracker-level attribution before it can land on the prompt row.
