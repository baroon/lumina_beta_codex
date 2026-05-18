# Master Project Brief — AI Visibility Platform

## Product purpose

Build an AI visibility platform that helps SMB/founder-led teams and content marketing teams understand how AI platforms mention, compare, cite, and recommend their brand — and then convert gaps into clear Content Actions.

The product is inspired by Peec-style AI visibility tracking and AirOps-style workflow/action systems, but v1 focuses on tracking, findings, and recommendations rather than workflow execution or content production.

## Product promise

Find where AI misses your brand — and what content to create or improve next.

## First ICP

- SMB / founder-led teams
- Content marketing teams

## V1 scope

V1 includes:

- Brand onboarding
- Website crawl for brand understanding
- Discovery extraction and confirmation
- Visibility Tracker creation
- Prompt generation and review
- Platform/cadence configuration
- Scan execution across selected AI platforms
- Signal extraction from AI answers
- Aggregated metrics
- Findings
- Content Actions
- Reporting UI
- Manual PDF/export report
- Scheduled scan email summary

V1 does not include:

- Full content briefs
- Full article/social generation
- Workflow engine
- CMS publishing
- Approval workflows
- GSC/GA/SEO tool integrations
- Pricing/plan finalization
- Advanced Focus Areas

## Core user-facing model

```text
Brand
→ Visibility Tracker
→ Prompts
→ Scan Runs
→ Findings
→ Content Actions
→ Reports
```

## Core internal model

```text
Workspace
→ Brand
  → BrandProfile / Products / Audiences / Markets / Topics / Competitors / TrustSignals
  → TrackerConfiguration
    → Coverage mappings
    → Prompts
    → ScanRuns
      → PromptRuns
        → AIAnswers
          → AnswerSignals / Mentions / Citations
    → ScanMetrics
    → Findings
    → ContentActions
    → Reports
```

## Four phases

1. Discovery
2. Tracker Setup & Execution
3. Analysis & Findings
4. Reporting & Actions UI

## Key architectural principle

Simple UX, normalized backend.

Users should not manage internal concepts like coverage mappings, prompt-to-dimension mappings, scan configuration objects, or analysis jobs. The backend stores these to support analytics, reporting, explainability, and future product evolution.

## Outcome-first principle

Metrics are evidence. Findings explain the problem. Content Actions tell the user what to do next.
