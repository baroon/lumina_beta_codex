# Navigation & Pages Plan

> Phase scope: build out the navigation/IA layer so a returning user can browse the whole app
> (tracker-scoped analytical surfaces, brand + tracker management, scan detail, settings stubs)
> without dead-end placeholders. Excludes auth, multi-workspace, and the dedicated new-user
> welcome page (deferred).
>
> IA inspired by Peec (see `lumina_resources/peec_screens/`) — flat analytical sidebar +
> top-of-sidebar scope selector — adapted to Lumina's multi-brand model. Where Peec has one
> brand per workspace and "project" as the scope unit, Lumina has many brands and uses
> **tracker** as the scope unit — brands group the trackers in the selector.

## Locked decisions (planning session 2026-06-10)

| Decision | Choice | Reason |
|---|---|---|
| Default landing | `/overview` | Already has an empty-state for no-brands. Welcome page deferred. |
| Workspace model | Multi-brand per workspace | Current data model supports it. Agency / multi-product segment depends on it. |
| Auth | Out of scope this phase | |
| **Scope selector** | **Tracker multi-select, grouped by brand, all-on by default** | Trackers are the measurement setup — discovery work pays off here. The selector matches Peec's project-picker pattern but respects Lumina's brand→tracker hierarchy. |
| **URL hierarchy** | **Split:** management = nested (`/brands/$id/...`, `/brands/$id/trackers/$id/...`); analytics = flat with `?trackers=` query param | Management URLs encode ownership for shareability + clear context. Analytics URLs are filter state — the query param reproduces selector state on shared links. |
| **Hub shape** | **Flat sidebar of analytical surfaces, not tabbed hubs**, *except* the tracker hub which keeps tabs | Each analytical surface is one sidebar item respecting the tracker filter. Tracker hub keeps tabs because it's the single-tracker management surface (schedule, lenses, prompts, scan history) and tabs read cleaner than spinning up another nav level. |

---

## Sitemap

```
/                                            Redirect → /overview
/overview                                    Workspace dashboard — respects ?trackers=
/prompts                                     Prompt table — respects ?trackers=
/sources/domains                             Domain-level citation view — respects ?trackers=
/sources/urls                                URL-level citation view — respects ?trackers=
/competitors                                 Competitor list/ranks — respects ?trackers=
/insights                                    Narrative ranking · BETA — respects ?trackers=
/scans                                       Scan history — respects ?trackers=
/scans/$scanRunId/{results,sources,topics,topics/$id,competitors,competitors/$id,claims}
                                             Scan detail surfaces (existing — flat)

/brands                                      Brand list (manage)
/brands/new                                  Add brand → discovery wizard
/brands/$brandId                             Redirect → /brands/$brandId/profile
/brands/$brandId/profile                     Brand profile + edit (one scrollable form)
/brands/$brandId/discovery                   Re-run discovery (existing)
/brands/$brandId/trackers/new                Create Visibility Tracker
/brands/$brandId/trackers/$trackerId         Tracker hub (tabs: Overview · Schedule · Prompts · Lenses · Scans)
/brands/$brandId/trackers/$trackerId/edit    Edit tracker

/settings/workspace                          Stub
/settings/profile                            Stub

— Deferred —
/auth/*                                      Sign-in/sign-up
/                                            Welcome landing for first-time users
/settings/{billing,members,api-keys}         Real settings
/brands/$brandId/tags                        Tag taxonomy (Peec pattern, not in our model yet)
/insights/* sub-pages                        Crawlability, agent analytics — Peec patterns
/trackers                                    Workspace-wide flat tracker list — optional convenience route, can defer
```

### Sidebar shape

```
┌────────────────────────────────────────┐
│ [▼ Trackers — All (5 of 5)         ]   │   Multi-select tree: brands → trackers
│ ⌘K Search                              │   Reserved row; functional later
├────────────────────────────────────────┤
│ ANALYTICS                              │
│   Overview                  /overview  │
│   Prompts                   /prompts   │
│   Sources › Domains         /sources/domains
│   Sources › URLs            /sources/urls
│   Competitors               /competitors
│   Insights · BETA           /insights  │
│   Scans                     /scans     │
├────────────────────────────────────────┤
│ MANAGE                                 │
│   Brands                    /brands    │   workspace brand list → profile/edit
│   Trackers                  /brands ↗  │   reuses Brands list with "Trackers" expanded; no separate route this phase
├────────────────────────────────────────┤
│ SETTINGS                               │
│   Workspace             /settings/workspace
│   Profile               /settings/profile
├────────────────────────────────────────┤
│ ─── 3 / 5 ─────────────                │   Future: onboarding meter (deferred)
└────────────────────────────────────────┘
```

**Scope semantics:**
- Selector default = all trackers checked → analytical pages render workspace view.
- Subset of trackers checked → analytical pages filter to those trackers.
- A whole brand expanded with all its trackers checked = brand view.
- A single tracker checked = single-tracker focus (Peec-equivalent single-project view).

**MANAGE > Trackers note:** rather than a separate `/trackers` workspace-wide list, the Brands list page exposes an expandable "Trackers (N)" sub-row per brand. Saves a route, keeps trackers visually anchored to their parent brand. The sidebar "Trackers" link scrolls / expands the trackers column on `/brands`. If product feedback later asks for a flat tracker table, add `/trackers` then.

---

## New vs returning user

### Returning user
1. Lands on `/overview`. Selector defaults to all trackers checked.
2. Optionally narrows scope via the selector — any number of trackers, across brands.
3. Drills into any analytical surface in one sidebar click. URL gets `?trackers=...` appended so the shared link reproduces scope.
4. Jumps to `MANAGE > Brands` to edit a brand profile or create a tracker.
5. Breadcrumb on management pages: `Workspace › Brand › Tracker › Scan` as applicable.

### New user (this phase)
1. Lands on `/overview` — sees empty state ("no tracked brands yet").
2. Empty-state CTA → `/brands/new` → discovery wizard.
3. After discovery confirm → lands on `/brands/$id/profile` (the new brand's identity page) with a callout: "Create your first Visibility Tracker".
4. Clicks Create → `/brands/$id/trackers/new` → existing tracker flow → first scan.
5. Once a tracker exists, the selector auto-checks it → analytical pages start filling in as scans complete.
6. Future welcome landing slots into `/` and replaces the `/overview` redirect — no other route changes.

---

## Page-by-page specification

For each page: route · purpose · scope · data · components reused vs new · empty/loading · acceptance.

### `/` — Smart landing
Redirect to `/overview`. Deferred welcome page slots in here later.

### `/overview` — Workspace dashboard
**Existing.** Now scope-aware: reads `?trackers=` from URL → filters all 5 categorized sections to those trackers.
- **Data:** workspace overview hooks accept optional `trackerIds` filter. Add the param if not already there.
- **Empty:** no scans for selected scope → existing empty state.

### `/prompts` — Prompt table
Working surface for prompt-level analysis. Columns: Prompt text · Topic · Visibility % · Sentiment · Position · Mention count · Models matrix · Tags · Country · Last scan.
- **Scope:** `?trackers=` filters which trackers' prompts appear.
- **In-page filters:** Last N days · Topic · Models · Lens.
- **Data:** new endpoint `GET /api/prompts?trackerIds=...&...` aggregating per-prompt metrics across scans in the window.
- **New:** `PromptsScreen`, `PromptsTable`.
- **Row click:** drawer with answer history for that prompt.
- **Empty:** "No prompts yet — create a tracker."

### `/sources/domains` — Domain-level citation source view
Trend chart at top (Source Retrieved by Domain, daily) above a domains table.
- **Columns:** Domain · Domain type · Retrieved % · Citation rate · Retrievals · Last seen.
- **Right rail:** Domain type breakdown donut.
- **Data:** new endpoint `GET /api/sources/domains?trackerIds=...`. `BrandSourceClassification` already encodes domain type.
- **New:** `DomainsScreen`, `DomainsTable`. Reuses `LineChartWrapper`.

### `/sources/urls` — URL-level citation view
Same shape at URL granularity. Columns: URL · URL type · Domain · Domain type · Retrieved % · Citation rate · Last updated.
- **Data:** new endpoint `GET /api/sources/urls?trackerIds=...`.
- **New:** `SourceUrlsScreen`, `SourceUrlsTable`.

### `/competitors` — Competitor ranks
Aggregated competitor view across selected trackers. Each row: competitor · mention count · mention rate · recommendation rate · share-of-voice · trend.
- **Reuses:** existing competitor data + components from `/scans/$id/competitors`.
- **New:** `CompetitorsScreen`.

### `/insights` — Narrative ranking · BETA
"You're #N in AI Visibility — Brand X, Y, Z lead". Performance matrix (brand × dimension, % cells). Top earnings table.
- **Status:** ships with a BETA chip in sidebar. First version uses templated narrative copy from existing metrics — LLM-generated copy lands later.
- **Data:** computed from `ScanMetrics` + competitor ranks for the selected scope.
- **New:** `InsightsScreen`, `PerformanceMatrix` molecule.

### `/scans` — Scan history
**Existing list.** Extend with `?trackers=` filter so the analytical scope flows through here too.

### `/scans/$scanRunId/*` — Scan detail
**Existing.** No change. Breadcrumb gets wired in: `Workspace › Brand › Tracker › Scan Run`.

---

### `/brands` — Brand list (MANAGE)
Workspace brand inventory with an expandable Trackers sub-row per brand.
- **Layout:** PageHeader with "Add brand" CTA → table with rows that expand to reveal their trackers.
  - **Brand row columns:** Brand name · Industry · Trackers (count, click to expand) · Last scan · Latest mention rate · ⋯ actions
  - **Expanded tracker rows:** Tracker name · Schedule · Last scan · Status · "Open" → `/brands/$id/trackers/$tid`
- **Sidebar "Trackers" link** scrolls to the table and expands all rows.
- **Data:** existing `useBrandsList` + new "trackers per brand" sub-fetch (or denormalized DTO).
- **New:** `BrandsManageScreen`. Renames the current `BrandList`.

### `/brands/new` — Add brand
**Existing.** Routes to discovery wizard.

### `/brands/$brandId` — Redirect → `/profile`
Single-line route handler.

### `/brands/$brandId/profile` — Brand profile (view + edit inline)
One long scrollable page. Sections:
- Identity (name, logo, website, industry, category, positioning, description)
- Aliases (chip editor)
- Products & Services
- Audiences
- Markets (visual map + list)
- Topics
- Competitors
- Trust signals
- Inline edit. Sticky "Save changes" pill bottom-right when dirty.
- **Reuses:** wizard step components, `AliasEditor`, existing `BrandProfile` DTOs.
- **New:** `BrandProfileScreen`.

### `/brands/$brandId/discovery` — Re-run discovery
**Existing.** No change.

### `/brands/$brandId/trackers/new` — Create tracker
**Existing flow,** re-routed under brand. Reuses `ReadyToCreateTrackerScreen` → `PromptReviewScreen` → `TrackerScheduleScreen` → `ScanProgressScreen`.

### `/brands/$brandId/trackers/$trackerId` — Tracker hub
**Tabbed.** Tabs (via `?tab=` query param, decided 2026-06-10 to avoid collision with `MetricCategoryLayout`'s hash-based scroll-spy on the Overview tab): Overview · Schedule · Prompts · Lenses · Scans.
- **Header:** tracker name · schedule chip · brand crumb (links to `/brands/$id/profile`) · "Run scan now" CTA.
- **Run scan now (decided 2026-06-10):** opens a right-side drawer with live progress (reuses `ScanProgressScreen` content). User stays on the tracker hub; can dismiss + reopen via a "Scan running" chip in the header. Best when the user wants to keep browsing the hub (e.g. read prompts) while watching.
- **Overview tab:** reuses `MetricCategoryLayout` with `trackerIds=[this]`.
- **Prompts tab:** reuses `PromptsTable`, scoped to this tracker.
- **Scans tab:** reuses the existing scan list, scoped to this tracker.
- **Note:** the tracker hub is the only "hub-with-tabs" survivor. Everything else flattened.

### `/brands/$brandId/trackers/$trackerId/edit` — Edit tracker
Single page with editable sections: schedule · platforms · lens selection · prompt set.

---

### `/settings/workspace` and `/settings/profile` — Stub pages
Placeholder "Coming soon" pages so sidebar Settings entries don't 404.

---

## Cross-cutting components (new)

### `TrackerSelector` (molecule, top-of-sidebar)
- **Trigger:** pill with current scope summary — e.g. "Trackers — All (5 of 5)" or "Trackers — 2 of 5" or "Trackers — Acme: Q3 Tracker".
- **Dropdown:** search input · workspace tri-state checkbox ("All trackers") · per-brand groupings (brand name + tri-state) · per-tracker checkboxes.
- **All-on default:** on first load (no `?trackers=` in URL), every tracker is checked.
- **State sync:** writes `?trackers=...` query param on change. Reads it on mount. Empty/missing param = all checked.
- **Visibility:** always present in the sidebar, on every page including management pages where it's inert (decided 2026-06-10). Keeps sidebar muscle memory consistent.
- **No-data trackers:** trackers with zero completed scans render greyed in the dropdown with a small label ("No scans yet" or "Scheduling…"). They remain checkable but contribute no data until scans complete — gives the user a contextual explanation for the empty-data case.
- **Edge cases:**
  - 0 trackers in workspace → selector reads "No trackers yet" + CTA "Add a brand".
  - 1 tracker → no group, just one checkbox.
  - Single-tracker focus → label reads tracker name.
- **a11y:** keyboard-navigable tree, ARIA tri-state checkboxes.

### `Breadcrumb` (molecule)
`items: Array<{ label: string; to?: string }>`. Last item is plain text. Used on tracker hub, tracker edit, scan detail. Resolves labels via React Query cache.

### `Tabs` (molecule)
For the Tracker hub. State synced to `?tab=` query param. Distinct from `MetricCategoryLayout` because hubs need only one panel visible at a time.

### Sidebar rework
Restructure existing `Sidebar.tsx`:
- Mount `TrackerSelector` at top.
- Three sections: ANALYTICS, MANAGE, SETTINGS (with small uppercase section labels).
- Drop standalone "Trackers", "Add brand", "Overview" duplicates.
- Onboarding meter stub at bottom — visual placeholder, no logic yet.

### `useTrackerScope` (hook, new)
Reads `?trackers=` from URL → returns `string[] | "all"`. Writes back on selector change. Every analytical screen consumes it and passes through to its data hook. Centralizes scope plumbing.

**Persistence across navigation (decided 2026-06-10):** when the user clicks an analytical sidebar link (Overview, Prompts, Sources/*, Competitors, Insights, Scans), the current `?trackers=` param is carried forward to the destination URL. Implementation: sidebar links use a wrapper component that appends the current scope query string. Reset is explicit — the user clicks "All" in the selector or removes specific trackers.

---

## Migration order

Keep tests green at every commit. Steps shippable individually:

1. **Cross-cutting molecules** (week 1)
   - `Breadcrumb` (component + story + test + manifest)
   - `Tabs` (component + story + test + manifest)
   - `TrackerSelector` (component + story + test + manifest) — wires into static fixtures first
   - `useTrackerScope` hook + tests
2. **Add new flat analytics routes alongside `/`** — old `/` keeps working
   - `/prompts`, `/sources/domains`, `/sources/urls`, `/competitors`, `/insights`
   - All initially render "Coming soon" placeholder bodies so the routes resolve
3. **Sidebar rework**
   - Replace existing sidebar nav with ANALYTICS / MANAGE / SETTINGS sections
   - Mount `TrackerSelector` at top
   - Drop standalone "Trackers", "Add brand"
4. **Wire `TrackerSelector` data + URL sync** — fetches trackers grouped by brand, writes `?trackers=`
5. **Make `/overview` scope-aware** — pass `trackerIds` from `useTrackerScope` to existing overview hooks (small backend filter add if missing)
6. **Move `/` → `/brands` (manage list)** — `indexRoute` becomes `<Navigate to="/overview" replace />`; new `/brands` route renders `BrandsManageScreen` with expandable tracker rows
7. **Build `/brands/$id/profile`** — composes existing wizard step components, sticky save bar
8. **Build `/brands/$id/trackers/$id` tracker hub** — wraps existing tracker components in `Tabs`
9. **Build `/brands/$id/trackers/$id/edit`**
10. **Wire breadcrumbs** into scan detail pages and tracker hub
11. **Build `/prompts`** — needs `GET /api/prompts?trackerIds=...` endpoint
12. **Build `/sources/domains` + `/sources/urls`** — needs `/api/sources/domains` + `.../urls` endpoints
13. **Build `/competitors`** — reuses existing scan-level competitor components, scope-aware
14. **Build `/insights`** (BETA) — templated narrative copy
15. **Build `/settings/workspace` + `/settings/profile`** stubs
16. **301 redirects** — any old `/trackers/$id` URLs (if used externally) → `/brands/$brand/trackers/$id`

Steps 1-10 are the minimum coherent IA rework — sidebar lit up, scope selector working, overview filtered, brand + tracker management reachable. Steps 11-15 ship one analytical surface at a time.

---

## Vocabulary check (per `docs/01-product-vocabulary.md`)

- Sidebar item labels use short forms (Overview / Prompts / Domains / Scans) for compactness, with full terms in page headers.
- TrackerSelector label uses "Trackers" (short) in the pill, "Visibility Trackers" in the dropdown header.
- "Scans" acceptable in nav; "Scan Run" appears in detail page headers.

---

## Out of scope (this phase)

- Authentication (`/auth/*`)
- Multi-workspace prefix
- Welcome landing for first-time users
- Real settings (billing, members, API keys, integrations)
- Onboarding progress meter logic (design + visual stub only)
- ⌘K command palette (sidebar row reserved, no functionality)
- Tag taxonomy (`/brands/$id/tags`) — Peec pattern, defer until model adopts tags
- Crawlability / agent-analytics — Peec patterns, separate phase
- LLM-generated narrative copy for Insights (templated v1 ok)
- Mobile-specific navigation
- Workspace-wide flat tracker list `/trackers` — reachable via expandable Brands list this phase

---

## Tactical decisions (resolved 2026-06-10)

All five tactical questions from the first plan draft were resolved in a one-at-a-time decision pass. They live inline in the component / page specs above:

| # | Question | Decision | Spec location |
|---|---|---|---|
| 1 | TrackerSelector visibility on management pages | Always present | `TrackerSelector` molecule |
| 2 | "Run scan now" UX on Tracker hub | Right-side drawer with live progress (reuses `ScanProgressScreen`) | `/brands/$brandId/trackers/$trackerId` |
| 3 | Tab state for Tracker hub | `?tab=` query param (avoids collision with `MetricCategoryLayout` hash sync) | `/brands/$brandId/trackers/$trackerId` |
| 4 | Scope persistence between analytical pages | Preserve `?trackers=` across sidebar nav (sidebar links wrap to append the current scope) | `useTrackerScope` hook |
| 5 | Trackers with no completed scans in selector | Show, greyed, with "No scans yet" hint; remain checkable | `TrackerSelector` molecule |

No further open questions blocking implementation.
