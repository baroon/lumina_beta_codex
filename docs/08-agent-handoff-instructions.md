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
