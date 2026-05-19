# Agent Handoff Instructions

Use this package when handing work to Codex, Claude Code, or another implementation agent.

## First instruction to agent

Read:

1. `docs/00-master-project-brief.md`
2. `docs/01-product-vocabulary.md`
3. `docs/02-end-to-end-user-flow.md`
4. `docs/03-phase-roadmap.md`
5. `docs/04-consolidated-domain-model.md`
6. `docs/architecture/01-consolidated-schema.md`

Then read the relevant phase-specific ADR/REQ/KANBAN docs before coding.

## Implementation discipline

- Do not expose internal terms like Coverage, PromptRun, ScanConfiguration, Insight, or Opportunity in v1 UI.
- Use user-facing terms: Visibility Tracker, Prompt, Finding, Content Action.
- Do not implement deferred features unless explicitly requested.
- Keep Phase 1 coding limited to Discovery foundation.
- Keep Phase 2 coding limited to Tracker setup/execution.
- Keep Phase 3 coding limited to analysis/findings/actions.
- Keep Phase 4 coding focused on reporting UI and view models.

## Code quality enforcement (day-one requirement)

The project uses a four-layer pre-commit enforcement system that must be set up before any code is written. This is not optional — it prevents architectural drift from the first commit.

**What gets enforced at commit time:**

1. **Prettier** — auto-formats staged files (semi, double quotes, 100 char width, LF)
2. **ESLint boundary rules** — blocks imports across layer boundaries (atoms/molecules/organisms), deprecated paths, and cross-feature imports
3. **Manifest sync** — validates component files against `component-manifest.json`:
   - `MISSING_MANIFEST_ENTRY` — component file has no manifest entry (ERROR)
   - `ORPHAN_MANIFEST_ENTRY` — manifest entry points to missing file (ERROR)
   - `DEPRECATED_DIRECTORY` — file in deprecated directory (ERROR)
   - `MISSING_STORY_FILE` — shared component has no `.stories.tsx` (ERROR)
   - `MISSING_TEST_FILE` — shared component has no `.test.tsx` (WARN, non-blocking)
4. **Husky + lint-staged** — orchestrates all of the above on staged files only

**Setup:**

- `pnpm install` in `src/` triggers the `prepare` script which installs Husky hooks
- If hooks don't run, execute `pnpm run prepare` from `src/`

**Shared component file convention:**

Every shared component (atoms, molecules, organisms, data-display, charts) must include:

```
ComponentName.tsx           ← Implementation
ComponentName.stories.tsx   ← Storybook stories (required — blocks commit if missing)
ComponentName.test.tsx      ← Unit tests (warned if missing, will block in future)
index.ts                    ← Barrel export
```

**Validation before completing work:**

Run `pnpm check:all` from `src/` before marking any frontend work as complete. This chains:

1. ESLint (structural boundaries)
2. TypeScript type-check
3. Vitest tests
4. Manifest sync (including story/test existence checks)

Read `src/agent-system/project-structure.md` § Pre-Commit Enforcement System and `src/agent-system/tech-stack.decisions.md` § Code Quality Enforcement for full details.

## Recommended first vertical slice

1. Phase 1 Discovery domain model and APIs
2. Combined Discovery confirmation UI
3. Tracker creation handoff stub
4. Then Phase 2 Tracker setup/prompt generation/execution foundation

## Important product rules

- User must review Discovery once.
- Prompts are user-facing, but prompt mappings are not.
- Platforms/models are fixed after tracker creation.
- Prompt allocation is fixed after tracker creation.
- ScanRuns are immutable snapshots.
- Content Briefs are not v1.
