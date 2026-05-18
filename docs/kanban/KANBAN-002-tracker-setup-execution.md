# KANBAN-002: Tracker Setup & Execution

## Backlog

### Domain model

- [ ] Create `TrackerConfiguration` entity
- [ ] Create backend Coverage mapping entities
- [ ] Create `Prompt` entity
- [ ] Create prompt mapping entities
- [ ] Create `AIPlatform` reference entity
- [ ] Create `ScanRun` entity
- [ ] Create `PromptRun` entity
- [ ] Create `AIAnswer` entity
- [ ] Create tracker notification setting entities
- [ ] Create `AnalysisJob` handoff entity or queue contract

### Reference data

- [ ] Seed AI platforms: ChatGPT, ChatGPT Search, Gemini, Claude
- [ ] Seed Visibility Checks
- [ ] Seed initial Prompt Templates
- [ ] Define prompt allocation defaults

### Tracker creation UX/API

- [ ] Generate suggested tracker name
- [ ] Build “Ready to create Visibility Tracker” screen
- [ ] Create tracker API endpoint
- [ ] Create backend Coverage automatically from Discovery outputs

### Prompt generation

- [ ] Build prompt generation service
- [ ] Generate prompts from prompt templates and tracker coverage
- [ ] Respect PromptAllocation
- [ ] Balance prompts across topics/checks/competitors
- [ ] Store prompt mappings for generated prompts

### Prompt review UX

- [ ] Prompt review screen
- [ ] Remove prompt
- [ ] Add custom prompt
- [ ] Infer mappings for custom prompt
- [ ] Regenerate all prompts
- [ ] Regenerate by Topic
- [ ] Regenerate by Visibility Check
- [ ] Regenerate by Topic + Visibility Check
- [ ] Confirm prompts

### Platform and cadence UX

- [ ] Platform selection screen after prompt confirmation
- [ ] Cadence selection screen after prompt confirmation
- [ ] Enforce fixed platform/model selection after tracker creation
- [ ] Support cadence changes after tracker activation

### Execution backend

- [ ] Run scan API endpoint
- [ ] Create ScanRun
- [ ] Create PromptRuns for Active Prompt × selected AIPlatform
- [ ] Queue PromptRun background jobs
- [ ] Implement provider adapter interface
- [ ] Implement ChatGPT adapter
- [ ] Implement ChatGPT Search adapter
- [ ] Implement Gemini adapter
- [ ] Implement Claude adapter
- [ ] Store clean answer text
- [ ] Store full raw provider response in object storage
- [ ] Implement retry policy
- [ ] Implement cancellation
- [ ] Implement partial completion logic
- [ ] Store TrackerSnapshotJson on ScanRun

### Live progress

- [ ] Define scan progress event payload
- [ ] Implement SSE/WebSocket progress stream
- [ ] Implement polling fallback
- [ ] Build progress screen
- [ ] Add rotating progress messages
- [ ] Add platform status cards
- [ ] Add scan check progress display

### Scheduled scans

- [ ] Add scheduled scan runner
- [ ] Support Daily / Weekly / Monthly schedules
- [ ] Skip if tracker paused
- [ ] Skip and log if a scan is already running
- [ ] Update NextRunAt and LastRunAt

### Notifications

- [ ] Add tracker notification settings UI/API
- [ ] Add notification recipients
- [ ] Send scheduled scan summary email
- [ ] Include partial/failure warnings
- [ ] Include link to web results

### Phase 3 handoff

- [ ] Enqueue AnalysisJob after Completed scan
- [ ] Enqueue AnalysisJob after PartiallyCompleted scan
- [ ] Do not enqueue for Failed/Cancelled scans
- [ ] Include ScanRun, AIAnswers, snapshots, and warnings in handoff

### Observability/eventing TODO

- [ ] Emit tracker created event
- [ ] Emit prompts generated event
- [ ] Emit prompts confirmed event
- [ ] Emit scan run queued event
- [ ] Emit scan run started event
- [ ] Emit prompt run completed/failed events
- [ ] Emit scan completed/partial/failed/cancelled events
- [ ] Emit analysis queued event
- [ ] Emit notification sent/failed events
- [ ] Define final event schema in future ADR

## In Progress

_None yet._

## Done

- [x] Phase 2 product decisions captured
- [x] Visibility Tracker terminology locked
- [x] Platform list locked for v1
- [x] Prompt editing UX removed from v1
- [x] Prompt allocation fixed per tracker
- [x] Platform/model selection fixed per tracker
- [x] Scan check progress terminology locked
- [x] Scheduled scan email summary decision locked
- [x] Manual PDF report generation decision locked

