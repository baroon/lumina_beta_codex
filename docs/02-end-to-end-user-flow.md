# End-to-End User Flow

## Phase 1: Discovery

1. User enters Brand name, Website URL, and primary market if known.
2. System crawls up to 10 same-domain pages.
3. System extracts initial suggestions from the crawl: BrandProfile, Products/Services, Audiences, Markets, TrustSignals. (Topics and Competitors are generated later in the wizard from the user's confirmed inputs.)
4. User steps through a Discovery confirmation wizard: Brand Identity → Products → Audiences & Markets → Competitive Landscape → Review & Confirm.
5. Throughout the wizard the user can select/unselect, edit, and add custom items, and can refine suggestions (advancing past Audiences & Markets re-derives Topics and Competitors; each lens can be refreshed up to 3 times).
6. The final Review & Confirm step presents a combined, editable summary of all sections.
7. Discovery is complete when required rules are met.

## Phase 2: Tracker Setup & Execution

1. System shows a congratulatory “Ready to create your Visibility Tracker” screen.
2. Suggested tracker name is generated and editable.
3. User clicks Create Visibility Tracker.
4. Backend creates TrackerConfiguration and backend coverage from Discovery.
5. System generates Draft prompts.
6. User reviews prompts.
7. User can remove, add custom prompts, regenerate all, regenerate by Topic, Visibility Check, or Topic + Visibility Check.
8. User confirms prompts.
9. User selects platforms and cadence.
10. User runs first scan.
11. System runs PromptRuns in background and shows live progress.
12. Completed/PartiallyCompleted scans automatically queue AnalysisJob.

## Phase 3: Analysis & Findings

1. Extract signals from AI answers.
2. Store AnswerSignals, Mentions, Sources, Citations.
3. Aggregate ScanMetrics.
4. Rules detect Findings.
5. LLM writes user-friendly Finding explanations.
6. Rules map Findings to normalized ContentActionTypes.
7. LLM writes user-friendly Content Action titles/recommendations.

## Phase 4: Reporting & Actions UI

1. User opens Scan Results.
2. Page is Findings-first, with metrics below.
3. User reviews Top Findings and Content Actions.
4. User can inspect metrics/charts/evidence.
5. User can export a manual PDF report.
6. Scheduled scans email summaries with links to web results.
