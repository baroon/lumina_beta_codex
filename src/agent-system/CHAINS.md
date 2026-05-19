# Agent Chain Reference

## Lumina AI Visibility Platform

> Hand this to every developer working on the codebase.
> The rule is simple: if your change touches component code, API endpoints,
> domain entities, or full-stack features, use a chain.
> If it doesn't, just talk to the agent directly.

---

## The one-line decision rule

```
Does this change touch a file that has tests, a Storybook story,
or belongs to a controller/handler/entity/migration?
  YES -> use a chain
  NO  -> talk to the agent directly
```

---

## Quick reference

| What you want to do                                           | Chain to use              |
| ------------------------------------------------------------- | ------------------------- |
| Route a UI task to the correct chain + run preflight          | `ui-intake`               |
| Build a new UI component                                      | `create-component`        |
| Fix a bug (frontend or backend)                               | `bug-fix`                 |
| Add or change a variant on an existing component              | `modify-variant`          |
| Wire a real API endpoint into a frontend component            | `integrate-api`           |
| Match UI to a screenshot, Figma export, or visual target      | `ui-match`                |
| Build a new page or route                                     | `add-feature-page`        |
| Build a new Nivo chart wrapper                                | `add-chart`               |
| Add Zod runtime validation for API responses                  | `add-zod-schema`          |
| Build a new API endpoint (controller + handler + validator)   | `create-endpoint`         |
| Build a new domain entity with EF Core mapping                | `create-entity`           |
| Build a new command handler                                   | `create-command`          |
| Build a new query handler                                     | `create-query`            |
| Build a new background job (Hangfire or MassTransit consumer) | `create-worker-job`       |
| Add a new AI platform adapter in Infrastructure               | `integrate-provider`      |
| Build a full vertical feature (API + frontend + tests)        | `create-feature-slice`    |
| Move code to the correct architectural layer                  | `migrate-logic`           |
| Change a config file, env var, CI pipeline                    | No chain -- talk directly |
| Fix a typo or one-liner CSS tweak                             | No chain -- talk directly |
| Wire up a third-party package                                 | No chain -- talk directly |
| Ask a question or explore options                             | No chain -- talk directly |

---

## How to invoke a chain

Since individual chain prompt files do not yet exist, reference the chain
sections within this document directly. When separate chain files are created
later (e.g., `agent-system/chains/create-component.chain.md`), the invocation
pattern will switch to reading those files instead.

Always start with:

```
Read agent-system/CHAINS.md (the [chain-name] section)
and agent-system/component-manifest.json.

[Your task description here.]

Follow the chain exactly.
```

The agent reads the chain section first, then follows its steps in order.
Never skip steps -- each step is a gate that protects against a specific
class of failure.

**When separate chain files exist**, the invocation changes to:

```
Read agent-system/chains/[chain-name].chain.md
and agent-system/component-manifest.json.

[Your task description here.]

Follow the chain exactly.
```

---

## Domain vocabulary

These are the core entities in the Lumina AI Visibility Platform. Use these
terms consistently across all chains, code, and documentation:

| Term                   | Meaning                                                  |
| ---------------------- | -------------------------------------------------------- |
| **Brand**              | The customer's brand being tracked for AI visibility     |
| **Visibility Tracker** | A configured monitoring job targeting a brand/topic set  |
| **Topic**              | A subject area the brand wants to be visible for         |
| **Visibility Check**   | A single prompt sent to an AI platform during a scan     |
| **Prompt**             | The natural-language question sent to an AI platform     |
| **Scan Run**           | One execution of all visibility checks in a tracker      |
| **Finding**            | A discrete insight extracted from AI platform responses  |
| **Content Action**     | A recommended action to improve AI visibility            |
| **Source**             | An external URL cited by an AI platform in its response  |
| **Citation**           | A reference to the brand's content within an AI response |

---

## The seventeen chains

---

### 1. `ui-intake`

**Use when:** You want a single entry point for UI work to classify the request,
run mandatory preflight checks, and route to the correct execution chain.

**Steps:**

1. Read the task description and classify the change type
2. Run preflight checks:
   - Does the target component exist in `component-manifest.json`?
   - What architectural layer does the change belong to?
   - Are required design tokens available in `design-tokens/tokens.json`?
   - What is the blast radius (which consumers depend on this component)?
3. Route to the correct chain based on classification:
   - Existing UI component changed (visual/behavior) --> `modify-variant` or `bug-fix`
   - New component needed --> `create-component`
   - New page/route needed --> `add-feature-page`
   - New chart needed --> `add-chart`
   - Design mismatch vs screenshot/Figma --> `ui-match`
   - API wiring needed --> `integrate-api`
   - Zod validation needed --> `add-zod-schema`
4. Produce a copy-paste ready chain invocation prompt
5. Flag any protected changes that will require human approval

**What it produces:**

- One of: `bug-fix`, `modify-variant`, `create-component`, `add-feature-page`, `add-chart`, `ui-match`, `integrate-api`, or `add-zod-schema`
- A preflight report (manifest, layer, tokens, blast-radius readiness)
- A copy-paste ready chain invocation prompt
- Protected-change warnings (if applicable)

**Example prompt:**

```
Read agent-system/CHAINS.md (the ui-intake section)
and agent-system/component-manifest.json.

UI task: Existing component changed in FindingCard.
Type: visual + behavior
Target: severity badge color mapping and click handler

Follow the chain exactly.
```

---

### 2. `create-component`

**Use when:** Building any new UI component that does not yet exist.

**Steps:**

1. **Manifest check** -- Verify the component does not already exist in `component-manifest.json`. If it does, stop and use `modify-variant` instead. If it does not exist, add the component entry to the manifest with status `planned`, all variants, dependencies, and a `notes` field
2. **Token check** -- Verify all required design tokens exist in `design-tokens/tokens.json`. If any are missing, add them before proceeding
3. **Implementation** -- Create `ComponentName.tsx` using:
   - CVA for all variant styling
   - `cn()` for conditional class merging
   - Design tokens via Tailwind classes only (no raw hex/rgb/arbitrary values)
   - Named export only (no default export)
   - Props interface with explicit typing
4. **Test** -- Create `ComponentName.test.tsx` with:
   - One test per variant
   - Interaction tests for clickable/interactive variants
   - Accessibility checks where applicable
   - Uses Vitest + React Testing Library
5. **Story** -- Create `ComponentName.stories.tsx` with:
   - One story per variant
   - Args for interactive props
   - Docs page with usage examples
6. **Barrel export** -- Create or update `index.ts` to export the component
7. **Review** -- Run all 14 Review & Lint checks (see below)

**What it produces:**

- `ComponentName.tsx` -- implementation
- `ComponentName.test.tsx` -- unit tests (all variants covered)
- `ComponentName.stories.tsx` -- one story per variant
- `index.ts` -- barrel export
- Updated `component-manifest.json`

**Example prompt:**

```
Read agent-system/CHAINS.md (the create-component section)
and agent-system/component-manifest.json.
Build the ConfidenceTag component. Follow the chain exactly.
```

**What the chain enforces:**

- Component is registered in the manifest before any code is written
- All design tokens are available before generation starts
- Four files always produced -- never fewer
- Review & Lint checks all 14 rules before the chain completes
- Manifest entry is current on completion

**When NOT to use it:**

- Changing an existing component --> use `modify-variant`
- Adding a new page --> use `add-feature-page`
- The component already exists under a different name

---

### 3. `bug-fix`

**Use when:** A reported defect in existing behaviour -- visual, functional,
state-related, or backend logic.

**Steps:**

1. **Diagnose** -- Identify root cause. Read the relevant source files, tests, and manifest entry. Explicitly list:
   - The root cause
   - The files that MUST be changed
   - The files that MUST NOT be changed (scope boundary)
2. **Failing test** -- Write a test that reproduces the bug and currently FAILS. This test must use:
   - Vitest + RTL for frontend bugs
   - xUnit + FluentAssertions for backend bugs
3. **Fix** -- Apply the minimal fix. Do not refactor, do not improve nearby code, do not clean up formatting in unrelated lines
4. **Verify** -- Confirm:
   - The new regression test passes
   - All existing tests still pass
   - The scope boundary was respected (no files outside scope were modified)
5. **Review** -- Run all 14 Review & Lint checks

**What it produces:**

- Fixed source file(s)
- A permanent regression test that will catch recurrence
- Updated manifest (if the bug was caused by an ambiguous spec)

**Example prompt:**

```
Read agent-system/CHAINS.md (the bug-fix section).

Bug: FindingCard shows "Unknown" severity when the API returns
severity level 0. Expected: should display "Info" severity badge
per the SeverityBadge component mapping.

Follow the chain exactly.
```

**The scope boundary rule:** The chain requires the agent to explicitly
list what must NOT be changed as part of the fix. The Review & Lint
agent checks this boundary and will reject the change if code outside
scope was modified. This prevents the most common agent failure:
"fixing the bug and also improving nearby code."

**When to escalate to human:**

- Fix requires changing more than 5 files
- Fix requires changing a component's public props interface
- Root cause is a race condition or timing issue
- Bug cannot be reproduced in a unit test (likely an integration issue)
- Fix requires a database migration

---

### 4. `modify-variant`

**Use when:** Adding a new variant to an existing component, or changing
the visual behaviour of an existing variant.

**Steps:**

1. **Manifest update** -- Update `component-manifest.json` first. Add the new variant to the component's `variants` array. The manifest is the spec -- code follows, never leads
2. **Blast radius** -- Identify all consumers of this component. If more than 5 affected nodes, pause for human approval before proceeding
3. **Implementation** -- Modify `ComponentName.tsx`:
   - Add variant to CVA definition
   - Ensure existing variants are unchanged
4. **Test update** -- Add test cases for the new variant in `ComponentName.test.tsx`. Existing variant tests must not be modified
5. **Story update** -- Add story for the new variant in `ComponentName.stories.tsx`
6. **Review** -- Run all 14 Review & Lint checks

**What it produces:**

- Modified `ComponentName.tsx`
- Modified `ComponentName.test.tsx`
- Modified `ComponentName.stories.tsx`
- Updated `component-manifest.json`

**Example prompt:**

```
Read agent-system/CHAINS.md (the modify-variant section)
and agent-system/component-manifest.json.
Add a "warning" variant to the ScanStatusBanner component.
Follow the chain exactly.
```

**What the chain enforces:**

- Blast radius is assessed before any code is touched
- Manifest is updated BEFORE code is changed
- Existing variants must continue to work exactly as before

**Do NOT use this chain for:**

- Removing a variant (requires human approval as a protected change)
- Building a new component from scratch (use `create-component`)

---

### 5. `integrate-api`

**Use when:** Replacing mock/stub data with a real API endpoint from the
C# backend, and wiring the data through TanStack Query into components.

**Steps:**

1. **Verify endpoint spec** -- Confirm the endpoint exists in the backend. Check the controller, DTO, and OpenAPI/Swagger spec. If the endpoint does not exist, stop and use `create-endpoint` first
2. **Create/update API function** -- Create or update the API function in `src/api/`:
   - Use the shared HTTP client (no raw `fetch()`)
   - TypeScript request/response types aligned to the backend DTOs
   - Named export
3. **Create TanStack Query hook** -- Create a custom hook in `src/hooks/` that wraps the API function:
   - `useQuery` for GET endpoints
   - `useMutation` for POST/PUT/DELETE endpoints
   - Proper query key structure
   - Loading and error states handled
4. **Wire component** -- Update the target component to use the TanStack Query hook:
   - Remove any mock/stub data
   - Handle loading state (use `LoadingSkeleton` or `Skeleton`)
   - Handle error state (use `ErrorBoundary` or inline error display)
   - Handle empty state (use `EmptyState` or `EmptyStatePanel`)
5. **Update MSW handlers** -- Create or update MSW mock handlers to match the real endpoint contract for tests and Storybook
6. **Test** -- Write integration tests verifying:
   - Successful data loading
   - Error state handling
   - Loading state rendering
   - MSW handler matches real contract
7. **Review** -- Run all 14 Review & Lint checks plus integration-specific checks

**What it produces:**

- TypeScript request/response types aligned to backend DTOs
- API function in `src/api/`
- TanStack Query hook in `src/hooks/`
- Updated component with real data binding
- MSW mock handlers for tests and Storybook
- Integration tests

**Example prompt:**

```
Read agent-system/CHAINS.md (the integrate-api section)
and agent-system/component-manifest.json.

Endpoint to integrate:
  - GET /api/trackers/{trackerId}/findings — returns paginated findings
Target component: FindingCard (used in TrackerDashboard)
Special handling: pagination

Follow the chain exactly.
```

**What the chain enforces:**

- Swagger/OpenAPI spec is the single source of truth -- no inferred fields
- All HTTP goes through shared client -- no raw `fetch()` anywhere
- Components never call API functions directly -- data flows through TanStack Query hooks
- Every async operation has loading + error companion states
- MSW handlers are kept in sync with real endpoints

**Special handling modes:**

| Mode            | What the chain does differently                                               |
| --------------- | ----------------------------------------------------------------------------- |
| `pagination`    | Adds cursor/offset params, uses `useInfiniteQuery` or offset-based pagination |
| `polling`       | Uses `refetchInterval` option on `useQuery`                                   |
| `file-upload`   | Uses `FormData` with appropriate content type                                 |
| `file-download` | Returns `Blob`, custom fetch handling                                         |
| `optimistic`    | Uses TanStack Query `onMutate` for optimistic updates with rollback           |
| `real-time`     | Pairs with SignalR for live updates, query invalidation on hub messages       |

**When NOT to use it:**

- The endpoint does not exist yet --> use `create-endpoint` first
- You need to build a new component to display the data --> use `create-component` first, then `integrate-api`
- The mock data is correct and you just need UI changes --> use `modify-variant` or `bug-fix`

---

### 6. `ui-match`

**Use when:** The current implementation does not visually match a target design.
You have a screenshot, Figma export, or written description of what it should look like.

**Steps:**

1. **Diff analysis** -- Identify every visual difference between the current implementation and the target design. Produce a numbered diff list
2. **Tier attribution** -- For each diff item, determine which architectural tier owns the fix. Present the attribution table and STOP for human confirmation before proceeding:
   - P1: Primitive/Core UI -- same property wrong across multiple screens, or fix is a pure token swap
   - P2: Token missing -- token-based fix needed but no token exists; add token first
   - M1: Molecule/Composite -- fix is about how primitives are composed (spacing, layout between parts)
   - F1: Feature/Page -- fix is unique to one screen's layout; wrong to apply globally
   - A1: Ambiguous -- could be P or M, or M or F; always surfaced for human decision
   - X1: Never -- patching a feature page to work around a primitive or molecule issue
3. **Token prerequisites** -- Add any missing tokens to `design-tokens/tokens.json` and regenerate CSS
4. **Phase 1: Token fixes** -- Apply token-level changes
5. **Phase 2: Primitive/Core UI fixes** -- Apply fixes to `src/components/ui/` components
6. **Phase 3: Molecule/Composite fixes** -- Apply fixes to composite components
7. **Phase 4: Feature/Page fixes** -- Apply page-specific layout fixes
8. **Lint gate between phases** -- Run lint and test between each phase
9. **Storybook verification** -- Produce a checklist of every story that must be verified visually. This is a human task -- open Storybook and check every item
10. **Review** -- Run all 14 Review & Lint checks

**What it produces:**

- Numbered diff list -- every visual difference identified
- Tier attribution table -- which tier owns each fix, with reasoning
- Blast radius -- every consumer affected by each change
- Ordered change plan -- tokens --> primitives --> molecules --> pages
- Implementation across all affected tiers, phase by phase
- Storybook verification checklist for human sign-off
- Updated `component-manifest.json` (version bumps + changelog entries)

**Example prompt:**

```
Read agent-system/CHAINS.md (the ui-match section),
agent-system/component-manifest.json, and
design-tokens/TOKENS.md.

[Attach screenshot or describe the visual target]

Target screen: TrackerDashboard -- Core Metrics Row

Follow the chain exactly.
```

Screenshots can be passed directly -- Claude Code reads images.

**Tier attribution rules:**

| Rule | Tier          | When it applies                                                                           |
| ---- | ------------- | ----------------------------------------------------------------------------------------- |
| P1   | Core UI       | Same property wrong across multiple screens using the same primitive, OR pure token swap  |
| P2   | Token missing | Token-based fix needed but no token exists -- add token first, then component code        |
| M1   | Composite     | Fix is about how primitives are composed inside a composite (spacing, internal layout)    |
| F1   | Feature/Page  | Fix is unique to one screen's layout -- wrong to apply globally                           |
| A1   | Ambiguous     | Could be P or M, or M or F -- always surfaced for human decision, never silently resolved |
| X1   | Never         | Patching a feature page to work around a primitive or composite issue                     |

**The two gates you must not skip:**

_Step 2 -- Tier attribution gate:_ The chain stops after producing the attribution
table and requires explicit confirmation before writing any code. If a diff item
is ambiguous (could reasonably belong to two tiers), the chain presents both
options with tradeoffs -- you pick one. Reply "Confirmed, proceed" or
"DIFF-004: use Option B, proceed". Do not reply "continue" to skip past this.

_Step 9 -- Storybook verification gate:_ The chain produces a checklist of every
story that must be verified. This is a human task -- open Storybook and check
every item before opening a PR.

**When NOT to use it:**

- Adding a new variant --> use `modify-variant`
- A behaviour is broken --> use `bug-fix`
- A component does not exist yet --> use `create-component`

---

### 7. `add-feature-page`

**Use when:** Adding a new page or route to the application.

**Steps:**

1. **Route planning** -- Determine the route path, params, and search params. Check existing routes in the TanStack Router configuration to avoid conflicts. This is a `ROUTE_STRUCTURE_CHANGE` -- flag as protected change
2. **Create route file** -- Create the route file following TanStack Router file-based routing conventions:
   - Define route params with type safety
   - Define search params with Zod validation
   - Set up loader for data fetching if needed
3. **Create page component** -- Create the page component in the appropriate feature directory:
   - Use `PageHeader` and `PageContent` layout components
   - Handle loading/error/empty states
   - Wire search params for filters (not React state)
4. **Wire data loading** -- Connect TanStack Query hooks for server data:
   - Use route loaders or component-level queries
   - Handle suspense boundaries
5. **Add to navigation** -- If the page should appear in the sidebar or breadcrumbs, update the relevant navigation configuration
6. **Test** -- Write tests for:
   - Route renders correctly with valid params
   - Route handles missing/invalid params gracefully
   - Page component renders with mock data
   - Navigation integration (if applicable)
7. **Review** -- Run all 14 Review & Lint checks

**What it produces:**

- Route file (TanStack Router)
- Page component (`.tsx`)
- Page component test (`.test.tsx`)
- Updated navigation config (if applicable)
- Updated route tree

**Example prompt:**

```
Read agent-system/CHAINS.md (the add-feature-page section)
and agent-system/component-manifest.json.

Add the Tracker Detail page at /trackers/$trackerId.
It should display the TrackerDashboard component with
CoreMetricsRow, charts, and tabbed content.

Follow the chain exactly.
```

**Protected change:** Route structure changes (`ROUTE_STRUCTURE_CHANGE`) require
human approval. The chain will pause at Step 1 and present the route
specification for sign-off before proceeding.

---

### 8. `add-chart`

**Use when:** Building a new Nivo chart wrapper component.

**Steps:**

1. **Manifest check** -- Verify the chart wrapper does not already exist in `component-manifest.json`. Add it if missing, under the "Charts" category
2. **Wrapper component** -- Create the chart wrapper in `src/components/charts/`:
   - Import the specific Nivo chart component (`@nivo/bar`, `@nivo/line`, `@nivo/pie`, etc.)
   - Apply Lumina theming from design tokens (colors, fonts, grid)
   - Accept typed data props
   - Handle responsive sizing
   - Named export only
3. **Story with mock data** -- Create Storybook story with representative mock data:
   - Default story with typical data shape
   - Edge case stories (empty data, single item, many items)
   - Story with real-world-like Lumina data (visibility scores, scan metrics, etc.)
4. **Test** -- Create unit test verifying:
   - Component renders without error
   - Correct Nivo component is rendered
   - Props are passed through correctly
5. **Review** -- Run all 14 Review & Lint checks

**What it produces:**

- `ChartNameWrapper.tsx` -- Nivo wrapper with Lumina theming
- `ChartNameWrapper.stories.tsx` -- stories with mock data
- `ChartNameWrapper.test.tsx` -- unit tests
- Updated `component-manifest.json`

**Example prompt:**

```
Read agent-system/CHAINS.md (the add-chart section)
and agent-system/component-manifest.json.
Build a SentimentDonut chart wrapper using @nivo/pie.
Follow the chain exactly.
```

**What the chain enforces:**

- Charts are always wrapped -- no direct Nivo imports in page components
- Lumina design tokens are applied for theming (chart colors, grid, fonts)
- Wrapper handles responsive sizing
- Mock data in stories represents realistic Lumina domain data

---

### 9. `add-zod-schema`

**Use when:** An API function uses manual TypeScript interfaces for response
types and needs runtime validation to catch contract drift.

**Steps:**

1. **Define schema** -- Create a `.schemas.ts` file alongside the API function:
   - Define Zod schemas matching the backend DTO shape exactly
   - Use `z.infer<typeof schema>` to derive TypeScript types -- no manual interfaces
   - Include all fields, nullability, and optional markers matching the API contract
2. **Pair with API function** -- Update the API function to:
   - Replace manual response interfaces with `z.infer<>` types
   - Parse responses through the Zod schema (using `.parse()` or `.safeParse()`)
3. **Contract test** -- Write contract tests that:
   - Validate MSW mock data against the Zod schema
   - Catch shape mismatches between mocks and real API contract
   - Test edge cases (nullable fields, empty arrays, boundary values)
4. **Review** -- Run all 14 Review & Lint checks

**What it produces:**

- `.schemas.ts` file with Zod schemas for all response types
- Updated API function with `z.infer<>` types replacing manual interfaces
- Contract tests validating mock data against schemas

**Example prompt:**

```
Read agent-system/CHAINS.md (the add-zod-schema section)
and agent-system/component-manifest.json.
Add Zod schemas for the trackers API responses.
Follow the chain exactly.
```

**What the chain enforces:**

- Schema-derived types via `z.infer<>` -- no manual response interfaces
- Runtime validation on API responses
- MSW mock data aligned with schema shapes
- Contract test coverage for every schema

---

### 10. `create-endpoint`

**Use when:** Building a new API endpoint on the C# backend.

**Steps:**

1. **Define the contract** -- Specify:
   - HTTP method and route (e.g., `POST /api/trackers/{trackerId}/scans`)
   - Request DTO (if applicable)
   - Response DTO
   - Authentication/authorization requirements
   - Which command or query handler will process the request
2. **Create DTOs** -- Create request and response DTOs in `Api/Contracts/`:
   - Use record types
   - Include XML doc comments for OpenAPI/Swagger documentation
3. **Create handler** -- Based on the operation type:
   - For mutations: create a command + command handler (or use `create-command` as a sub-chain)
   - For reads: create a query + query handler (or use `create-query` as a sub-chain)
4. **Create validator** -- Create a FluentValidation validator for the request DTO:
   - Validate all required fields
   - Validate field formats and ranges
   - Include meaningful error messages
5. **Create controller action** -- Add the action method to the appropriate controller:
   - Inject and dispatch to the handler
   - Return appropriate HTTP status codes
   - Apply `[Authorize]` and any policy requirements
   - Add `[ProducesResponseType]` attributes for Swagger
6. **Test** -- Write tests using xUnit + FluentAssertions:
   - Handler unit tests (with NSubstitute for dependencies)
   - Validator tests (all rules covered)
   - Integration test using `WebApplicationFactory` (if applicable)
7. **Review** -- Verify:
   - Route follows REST conventions
   - DTOs are in the correct namespace
   - Validator covers all rules
   - ProblemDetails used for error responses
   - OpenAPI attributes are complete

**What it produces:**

- Request/Response DTOs (`Api/Contracts/`)
- Command or Query class (`Application/`)
- Command or Query Handler (`Application/`)
- FluentValidation Validator (`Application/`)
- Controller action method (`Api/Controllers/`)
- Handler unit tests
- Validator tests
- Integration test (optional)

**Example prompt:**

```
Read agent-system/CHAINS.md (the create-endpoint section).

Create: POST /api/trackers/{trackerId}/scans/trigger
Purpose: Trigger a new scan run for a tracker
Auth: Requires authenticated user with workspace access
Response: 202 Accepted with { scanRunId, status }

Follow the chain exactly.
```

**Protected change:** If the endpoint modifies auth/tenancy logic, this is a
`AUTH_TENANCY_CHANGE` and requires human approval.

---

### 11. `create-entity`

**Use when:** Building a new domain entity with its EF Core configuration
and database migration.

**Steps:**

1. **Define the entity** -- Create the entity class in `Domain/Entities/`:
   - Use the domain vocabulary (Brand, Tracker, Topic, etc.)
   - Include audit fields (CreatedAt, UpdatedAt, CreatedBy)
   - Include workspace tenancy field (WorkspaceId)
   - Define navigation properties and relationships
2. **Create EF Core configuration** -- Create an `IEntityTypeConfiguration<T>` in `Infrastructure/Persistence/Configurations/`:
   - Table name, schema
   - Column types and constraints
   - Indexes (including workspace-scoped composite indexes)
   - Relationships and cascade behavior
3. **Add to DbContext** -- Add the `DbSet<T>` property to the application DbContext
4. **Create migration** -- Generate the EF Core migration:
   - `dotnet ef migrations add AddEntityName`
   - Review the generated migration for correctness
   - This is a `DATABASE_SCHEMA_CHANGE` -- flag as protected change
5. **Test** -- Write tests verifying:
   - Entity can be persisted and retrieved (using Testcontainers PostgreSQL)
   - Configuration constraints are enforced
   - Tenant isolation is correct (workspace-scoped queries)
6. **Review** -- Verify:
   - Entity follows domain naming conventions
   - All required indexes exist
   - Tenant isolation is enforced
   - Migration is reversible

**What it produces:**

- Entity class (`Domain/Entities/`)
- EF Core configuration (`Infrastructure/Persistence/Configurations/`)
- Updated DbContext
- EF Core migration
- Persistence tests

**Example prompt:**

```
Read agent-system/CHAINS.md (the create-entity section).

Create the Finding entity:
- Belongs to a ScanRun (FK)
- Has: FindingType, Severity, Title, Description, Confidence, Evidence (JSON)
- Workspace-scoped
- Indexed by ScanRunId and Severity

Follow the chain exactly.
```

**Protected change:** Database schema changes (`DATABASE_SCHEMA_CHANGE`) always
require human approval. The chain will pause at Step 4 and present the
migration SQL for review before applying.

---

### 12. `create-command`

**Use when:** Building a new command handler for a mutation operation
(create, update, delete, trigger).

**Steps:**

1. **Define the command** -- Create the command record in `Application/Commands/`:
   - Include all fields needed for the operation
   - Include the workspace context (WorkspaceId, UserId)
2. **Create the handler** -- Create the command handler:
   - Inject required repositories/services via constructor
   - Implement the business logic
   - Publish domain events if side effects are needed (via MassTransit)
   - Return a result type (not void -- return the created/updated entity ID or a result DTO)
3. **Create the validator** -- Create a FluentValidation validator for the command:
   - All required fields validated
   - Business rule validations (e.g., "tracker must belong to workspace")
   - Meaningful error messages
4. **Test** -- Write unit tests using xUnit + FluentAssertions + NSubstitute:
   - Happy path (command succeeds)
   - Validation failures (each rule tested)
   - Business rule violations
   - Side effect verification (events published)
5. **Review** -- Verify:
   - Command follows naming convention (`Create[Entity]Command`, `Update[Entity]Command`, etc.)
   - Handler has no direct infrastructure dependencies (uses abstractions)
   - Validator covers all rules
   - Tests cover all paths

**What it produces:**

- Command record (`Application/Commands/`)
- Command handler
- FluentValidation validator
- Unit tests

**Example prompt:**

```
Read agent-system/CHAINS.md (the create-command section).

Create: TriggerScanRunCommand
Fields: TrackerId, WorkspaceId, UserId, TriggeredBy (manual/scheduled)
Behavior: Validate tracker exists and belongs to workspace,
create ScanRun entity with status "Pending",
publish ScanRunTriggeredEvent via MassTransit.

Follow the chain exactly.
```

---

### 13. `create-query`

**Use when:** Building a new query handler for a read operation.

**Steps:**

1. **Define the query** -- Create the query record in `Application/Queries/`:
   - Include all filter/sort/pagination parameters
   - Include workspace context (WorkspaceId)
2. **Define the result DTO** -- Create the response DTO:
   - Use record types
   - Include only the fields needed by the consumer
   - For paginated results, use a standard pagination wrapper
3. **Create the handler** -- Create the query handler:
   - Use EF Core queries (IQueryable) with projection
   - Apply workspace tenant filter
   - Apply sorting and pagination
   - Map to result DTO (manual mapping, no AutoMapper)
4. **Test** -- Write unit tests:
   - Happy path with expected data
   - Empty result set
   - Pagination behavior
   - Tenant isolation (query does not return other workspaces' data)
5. **Review** -- Verify:
   - Query follows naming convention (`Get[Entity]Query`, `List[Entities]Query`)
   - Projection is used (no full entity loading when only partial data is needed)
   - Tenant filter is applied
   - Pagination is correct

**What it produces:**

- Query record (`Application/Queries/`)
- Result DTO
- Query handler
- Unit tests

**Example prompt:**

```
Read agent-system/CHAINS.md (the create-query section).

Create: ListFindingsQuery
Parameters: TrackerId, ScanRunId (optional), Severity (optional filter),
            Page, PageSize, SortBy, SortDirection
Result: Paginated list of FindingSummaryDto
Tenant: WorkspaceId filter required

Follow the chain exactly.
```

---

### 14. `create-worker-job`

**Use when:** Building a new background job, either as a Hangfire fire-and-forget
job or a MassTransit consumer.

**Steps:**

1. **Classify job type** -- Determine the right mechanism:
   - **Hangfire** -- for fast fire-and-forget jobs that need persistence and retry (e.g., discovery crawl dispatch, email sending, PDF generation)
   - **MassTransit consumer** -- for event-driven jobs that participate in a saga/pipeline (e.g., scan step processing, analysis pipeline stages)
2. **Create the job/consumer** -- Based on classification:
   - _Hangfire:_ Create a job class in `Worker/Jobs/` with a public method. Inject dependencies via constructor. Add `[AutomaticRetry]` attributes as needed
   - _MassTransit:_ Create a consumer class in `Worker/Consumers/` implementing `IConsumer<TMessage>`. Define the message contract in `Application/Events/` or `Application/Commands/`
3. **Register the job** -- Wire up registration:
   - _Hangfire:_ Register in the Hangfire configuration. If recurring, add the cron schedule
   - _MassTransit:_ Register the consumer in the MassTransit configuration. If part of a saga, update the saga state machine
4. **Error handling** -- Implement:
   - Retry policy (Hangfire `AutomaticRetry` or MassTransit retry middleware)
   - Dead-letter / fault handling
   - Logging with structured context (job ID, entity IDs, workspace ID)
5. **Test** -- Write unit tests:
   - Job executes successfully with valid input
   - Job handles transient failures (retry behavior)
   - Job handles permanent failures (dead-letter behavior)
   - For MassTransit: consumer processes message correctly, publishes expected follow-up events
6. **Review** -- Verify:
   - Job is idempotent (safe to retry)
   - Workspace context is preserved
   - Logging is sufficient for debugging
   - Error handling covers all failure modes

**What it produces:**

- Job class (`Worker/Jobs/`) or Consumer class (`Worker/Consumers/`)
- Message contract (for MassTransit consumers)
- Registration/configuration updates
- Unit tests

**Example prompt:**

```
Read agent-system/CHAINS.md (the create-worker-job section).

Create: ProcessVisibilityCheckConsumer (MassTransit)
Message: ProcessVisibilityCheckCommand { ScanRunId, PromptId, PlatformId }
Behavior: Send prompt to AI platform via adapter, parse response,
create Finding entities, publish VisibilityCheckCompletedEvent.
Retry: 3 attempts with exponential backoff.

Follow the chain exactly.
```

**Protected change:** If the job modifies or creates a MassTransit saga/state
machine, this is a `SAGA_STATE_MACHINE_CHANGE` and requires human approval.

---

### 15. `integrate-provider`

**Use when:** Adding a new AI platform adapter in the Infrastructure layer
(e.g., adding support for a new LLM provider like Perplexity, Gemini, etc.).

**Steps:**

1. **Define the adapter interface** -- If the `IAiPlatformAdapter` interface does not already exist, create it. If it exists, verify the new provider can conform to the existing contract. If the interface needs changes, flag as a protected change (`SERVICE_CONTRACT_CHANGE`)
2. **Create the adapter** -- Create the adapter class in `Infrastructure/AiProviders/`:
   - Implement the platform adapter interface
   - Handle authentication (API key from configuration)
   - Implement request/response mapping to the platform's API
   - Handle rate limiting, timeouts, and transient errors
   - Parse structured responses (extract citations, sources, confidence signals)
3. **Register the adapter** -- Add the adapter to the DI container with a named/keyed registration so it can be resolved by platform identifier
4. **Configuration** -- Add configuration entries:
   - API key placeholder in configuration (appsettings, Key Vault reference)
   - Platform-specific settings (model name, max tokens, timeout)
5. **Test** -- Write tests:
   - Unit tests with mocked HTTP responses
   - Response parsing tests (various response shapes)
   - Error handling tests (rate limit, timeout, auth failure)
   - Integration test with real API (guarded by environment variable, not run in CI by default)
6. **Review** -- Verify:
   - Adapter conforms to the interface exactly
   - No platform-specific logic leaks outside the adapter
   - API key is not hardcoded
   - Error handling is comprehensive
   - Response parsing extracts all required fields (answer text, sources, citations)

**What it produces:**

- Adapter class (`Infrastructure/AiProviders/`)
- DI registration
- Configuration entries
- Unit tests
- Integration test (optional, env-guarded)

**Example prompt:**

```
Read agent-system/CHAINS.md (the integrate-provider section).

Add adapter for: Perplexity AI (pplx-api)
API: https://api.perplexity.ai/chat/completions
Auth: Bearer token
Response parsing: extract answer text, source URLs from citations array
Rate limit: 50 req/min

Follow the chain exactly.
```

---

### 16. `create-feature-slice`

**Use when:** Building a complete vertical feature that spans backend and frontend --
from database entity through API endpoint to rendered UI component.

**Steps:**

1. **Plan the slice** -- Define the full vertical:
   - Entity/entities needed (use `create-entity` sub-chain)
   - Command/query handlers (use `create-command` / `create-query` sub-chains)
   - API endpoint(s) (use `create-endpoint` sub-chain)
   - Frontend components needed (use `create-component` sub-chain)
   - API integration (use `integrate-api` sub-chain)
   - Page/route if needed (use `add-feature-page` sub-chain)
2. **Execute backend chains** -- In order:
   a. `create-entity` (if new entities are needed)
   b. `create-command` and/or `create-query` (for business logic)
   c. `create-endpoint` (to expose the API)
3. **Execute frontend chains** -- In order:
   a. `create-component` (for any new UI components)
   b. `add-chart` (if charts are needed)
   c. `integrate-api` (to wire frontend to backend)
   d. `add-feature-page` (if a new route is needed)
   e. `add-zod-schema` (for runtime contract validation)
4. **End-to-end verification** -- Verify the complete flow:
   - API endpoint returns correct data
   - Frontend renders data correctly
   - Loading/error/empty states all work
   - Navigation to the feature works
5. **Review** -- Run all 14 Review & Lint checks across all produced files

**What it produces:**

- All artifacts from each sub-chain executed
- A complete, working vertical feature from database to UI

**Example prompt:**

```
Read agent-system/CHAINS.md (the create-feature-slice section).

Feature: Content Actions
- Entity: ContentAction (belongs to Finding, has ActionType, Priority,
  Title, Description, Status)
- Query: ListContentActionsQuery (by TrackerId, filterable by Status and Priority)
- Command: UpdateContentActionStatusCommand (mark as done/dismissed)
- Endpoint: GET /api/trackers/{trackerId}/content-actions
- Endpoint: PATCH /api/content-actions/{actionId}/status
- Component: ContentActionCard (displays a single action)
- Page: Content Actions tab within TrackerDashboard

Follow the chain exactly.
```

**Note:** This chain orchestrates sub-chains. Each sub-chain follows its own
steps in order. The feature slice chain ensures they are executed in the
correct dependency order (entities before handlers, handlers before endpoints,
endpoints before frontend integration).

---

### 17. `migrate-logic`

**Use when:** Logic has ended up in the wrong architectural layer --
business logic inside a component, validation inline in a page file,
API calls in JSX, state logic in components, or backend logic in the
wrong layer (e.g., domain logic in a controller).

**Steps:**

1. **Identify the misplacement** -- Read the source file and classify the logic:
   - What the logic does
   - Where it currently lives
   - Where it should live (see target layers table below)
2. **Write characterisation tests** -- Before moving anything, write tests that document the current behaviour exactly:
   - For frontend: Vitest tests that exercise the logic in its current location
   - For backend: xUnit tests that exercise the logic
   - These tests must pass before AND after migration
3. **Extract the logic** -- Copy the logic to its correct location:
   - Do NOT modify the logic during extraction -- exact copy
   - Do NOT fix bugs, improve performance, or clean up code
   - Create the new file at the correct layer
4. **Update the source** -- Replace the inline logic with an import from the new location:
   - The source file now imports and calls the extracted function/hook/service
   - Behaviour must be identical
5. **Verify** -- Confirm:
   - Characterisation tests still pass (behaviour unchanged)
   - All existing tests still pass
   - No logic was modified during the move
6. **Review** -- Run all 14 Review & Lint checks

**What it produces:**

- New extracted function file at the correct layer
- Characterisation tests that document and verify the extracted behaviour
- Cleaned source file (now imports instead of inlining)
- Updated source file tests

**Target layers (Frontend):**

| Logic type                      | Where it goes         |
| ------------------------------- | --------------------- |
| Pure functions, no side effects | `src/utils/`          |
| API call functions              | `src/api/`            |
| TanStack Query hooks            | `src/hooks/`          |
| React-lifecycle-dependent logic | `src/hooks/`          |
| Form validation schemas         | `src/schemas/`        |
| URL search param parsing        | Route definition file |

**Target layers (Backend):**

| Logic type                      | Where it goes                      |
| ------------------------------- | ---------------------------------- |
| Business rules and domain logic | `Domain/` or `Application/`        |
| Data access queries             | `Infrastructure/Persistence/`      |
| External service calls          | `Infrastructure/`                  |
| Request validation              | `Application/Validators/`          |
| DTO mapping                     | `Application/` (handler or mapper) |

**The extraction-only rule:** This chain is deliberately conservative.
If you notice a bug while migrating, do NOT fix it in this chain.
File a separate bug report and run `bug-fix` after migration is complete.
Mixing a migration with a fix makes both changes harder to review and
harder to roll back.

**Example prompt:**

```
Read agent-system/CHAINS.md (the migrate-logic section).

The visibility score calculation in TrackerDashboard.tsx is inline JSX.
It should be in src/utils/visibility-score.ts.
Migrate it. Follow the chain exactly.
```

---

## Review & Lint checks (run at the end of every chain)

Every chain ends with 14 review checks. You never need to run these
manually -- the chain handles it. But knowing what they cover helps
you understand why the chain sometimes blocks a change:

> **Automated enforcement:** A subset of these checks (import boundaries,
> deprecated path bans, formatting, manifest sync) are enforced automatically
> by the pre-commit hook via Prettier, ESLint, and manifest-sync-lite.
> Commits that violate these rules will be rejected at `git commit` time.
> See `project-structure.md` § Pre-Commit Enforcement System for details.

1. **Import order correct** -- React --> external libs --> internal components --> types --> styles
2. **All manifest variants implemented** -- Every variant listed in `component-manifest.json` has a corresponding CVA variant and rendering path
3. **CVA used for all variant styling** -- No string concatenation for conditional classes; use CVA variant definitions
4. **`cn()` used for conditional classes** -- All conditional class merging uses the `cn()` utility (clsx + tailwind-merge)
5. **Design tokens used** -- No raw hex, rgb, hsl, or arbitrary Tailwind values (e.g., `bg-[#ff0000]`); all visual values come from design tokens via Tailwind theme classes
6. **No direct fetch in components** -- Components never call `fetch()` or API functions directly; data flows through the API layer (`src/api/`) and TanStack Query hooks (`src/hooks/`)
7. **Named exports only** -- No default exports anywhere; all exports are named
8. **File in correct location** -- File is in the correct directory per `project-structure.md` conventions
9. **Manifest entry exists and is current** -- The component has an entry in `component-manifest.json` and the entry matches the implementation (variants, dependencies, status)
10. **Test coverage adequate** -- Tests exist for all variants, all error states, and all interaction paths
11. **One story per variant** -- For UI components, Storybook has at least one story per variant defined in the manifest
12. **Charts use wrapper pattern** -- No direct Nivo imports in page/feature components; all charts go through `src/components/charts/` wrappers
13. **Forms use React Hook Form + Zod** -- All forms use React Hook Form for state management and Zod schemas for validation; no manual form state or inline validation
14. **URL search params used for filters** -- Page-level filter state (sort, search, pagination, status filters) lives in URL search params via TanStack Router, not in React state

If any check fails, the chain sets status to BLOCKED and lists the exact
file, line, and fix required. The chain retries up to 2 times before
escalating to human.

**Which checks are enforced automatically by pre-commit:**

| Check                                  | Automated? | Mechanism                                                               |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| 1. Import order                        | No         | Manual review                                                           |
| 2. All manifest variants implemented   | No         | Manual review                                                           |
| 3. CVA used for all variant styling    | No         | Manual review                                                           |
| 4. `cn()` used for conditional classes | No         | Manual review                                                           |
| 5. Design tokens used                  | No         | Manual review                                                           |
| 6. No direct fetch in components       | Yes        | ESLint `no-restricted-imports` (atom/molecule/organism boundary rules)  |
| 7. Named exports only                  | No         | Manual review                                                           |
| 8. File in correct location            | Partial    | ESLint deprecated path ban + manifest sync `DEPRECATED_DIRECTORY` check |
| 9. Manifest entry exists               | Yes        | manifest-sync-lite `MISSING_MANIFEST_ENTRY` + `ORPHAN_MANIFEST_ENTRY`   |
| 10. Test coverage adequate             | Partial    | manifest-sync-lite `MISSING_TEST_FILE` (WARN) — file existence only    |
| 11. One story per variant              | Partial    | manifest-sync-lite `MISSING_STORY_FILE` (ERROR) — file existence only  |
| 12. Charts use wrapper pattern         | No         | Manual review                                                           |
| 13. Forms use React Hook Form + Zod    | No         | Manual review                                                           |
| 14. URL search params for filters      | No         | Manual review                                                           |

Additionally, the pre-commit hook enforces:

- **Formatting** via Prettier (auto-fixed on commit)
- **Layer boundary rules** via ESLint (atoms cannot import molecules/organisms/features, molecules cannot import organisms/features, no cross-feature imports)
- **Deprecated path bans** via ESLint (no imports from `@/components/ui/`, `@/components/layout/`, `@/components/feedback/`)

---

## Protected changes (always require human approval)

Some changes pause any chain and wait for explicit human sign-off
before proceeding. These are not agent decisions -- they are mandatory
human gates:

| Protected change                  | Flag                        | Why human approval is required                                    |
| --------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| Database schema changes           | `DATABASE_SCHEMA_CHANGE`    | Migrations affect production data; irreversible if wrong          |
| Route structure changes           | `ROUTE_STRUCTURE_CHANGE`    | Routing affects all E2E tests and navigation                      |
| Component deletions from manifest | `COMPONENT_REMOVAL`         | Consumers may break silently                                      |
| Auth/tenancy model changes        | `AUTH_TENANCY_CHANGE`       | Security boundary changes have the highest blast radius           |
| MassTransit saga/state machine    | `SAGA_STATE_MACHINE_CHANGE` | Saga changes affect in-flight messages and pipeline orchestration |
| SignalR hub contract changes      | `HUB_CONTRACT_CHANGE`       | Hub changes break all connected real-time clients                 |

When you see the agent pause at one of these, read the report it
produces and approve or reject explicitly. Do not just say "continue"
without reading -- these gates exist because downstream blast radius
is high.

---

## Talking directly to the agent (no chain needed)

For anything outside component code and structured backend operations,
just describe what you want:

```
# Config changes
Update the appsettings.Development.json to add the Perplexity API key placeholder

# Dependency changes
Add the @nivo/sunburst package to the frontend

# Questions
Why is the TrackerDashboard using a bar chart instead of a line chart
for visibility trend?

# Exploring options
What are the tradeoffs between polling and SignalR for scan progress updates?

# Trivial fixes
The label on the severity filter says "Severity" but it should say "Impact Level"
```

The chains exist because component and endpoint changes have blast radius.
A label typo does not need a blast radius report.

---

## When the agent asks "should I use a chain?"

It will sometimes ask. The answer:

**Frontend:**

- Touching `.tsx`, `.test.tsx`, `.stories.tsx`, `index.ts` --> yes, use a chain
- Touching route files --> yes, use `add-feature-page` or `bug-fix`
- Visual output does not match a design --> yes, use `ui-match`
- Adding a chart to a page --> yes, use `add-chart`
- Adding form validation --> yes, use `add-zod-schema`

**Backend:**

- Adding a new controller action --> yes, use `create-endpoint`
- Adding a new entity --> yes, use `create-entity`
- Adding a command handler --> yes, use `create-command`
- Adding a query handler --> yes, use `create-query`
- Adding a background job --> yes, use `create-worker-job`
- Adding an AI provider adapter --> yes, use `integrate-provider`

**Full-stack:**

- Building a complete feature from DB to UI --> yes, use `create-feature-slice`
- Moving logic to the correct layer --> yes, use `migrate-logic`

**No chain needed:**

- Touching config files, env vars, CI/CD --> no chain
- Updating dependencies --> no chain
- Asking questions or exploring options --> no chain
- Trivial copy or label fixes --> no chain

If classification is unclear at intake, use `ui-intake` first, then route.

If you are not sure, ask:

```
Is this change large enough to need a chain, or can we fix it directly?
```

The agent will tell you which chain applies, or confirm it is a direct fix.
