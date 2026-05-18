# KANBAN-003: Analysis & Findings

## Backlog

### Architecture / Design

- [ ] Define final source taxonomy seed list.
- [ ] Define source domain and URL normalization rules.
- [ ] Define finding trigger thresholds.
- [ ] Define severity calculation rules.
- [ ] Define confidence scoring rules.
- [ ] Define low-sample-size handling.
- [ ] Define analysis event taxonomy and payloads.
- [ ] Define reprocessing/versioning behavior.

### Data Model

- [ ] Create AnalysisJob schema.
- [ ] Create AnswerSignal schema.
- [ ] Create Mention schema.
- [ ] Create Source schema.
- [ ] Create SourceUrl schema.
- [ ] Create Citation schema.
- [ ] Create BrandSourceClassification schema.
- [ ] Create ScanMetric schema.
- [ ] Create Finding schema.
- [ ] Create Finding mapping tables.
- [ ] Create ContentActionType reference schema.
- [ ] Create ContentAction schema.
- [ ] Create ContentAction mapping tables.

### Reference Data

- [ ] Seed SourceType reference values.
- [ ] Seed FindingType reference values.
- [ ] Seed ContentActionType reference values.
- [ ] Seed sentiment enum values.
- [ ] Seed recommendation strength enum values.

### Signal Extraction

- [ ] Implement Mention extraction from AIAnswer.
- [ ] Implement Brand mention detection.
- [ ] Implement Competitor mention detection.
- [ ] Implement Product mention detection.
- [ ] Implement meaningful Other mention extraction.
- [ ] Implement mention position extraction.
- [ ] Implement recommendation strength extraction.
- [ ] Implement entity-level sentiment extraction.
- [ ] Implement AnswerSignal creation.
- [ ] Implement citation/source extraction.
- [ ] Implement mentioned source extraction without URL.
- [ ] Implement source classification.

### Aggregation

- [ ] Compute overall scan metrics.
- [ ] Compute platform-level metrics.
- [ ] Compute topic-level metrics.
- [ ] Compute visibility-check-level metrics.
- [ ] Compute competitor-level metrics.
- [ ] Compute source-type-level metrics.
- [ ] Store ScanMetric records.

### Finding Generation

- [ ] Implement LowVisibility rule.
- [ ] Implement LowRecommendation rule.
- [ ] Implement CompetitorDominance rule.
- [ ] Implement NegativeSentiment rule.
- [ ] Implement CitationGap rule.
- [ ] Implement CompetitorCitationGap rule.
- [ ] Implement ContentGap rule.
- [ ] Implement StrongVisibility rule.
- [ ] Implement EmergingCompetitor rule.
- [ ] Add LLM explanation generation for Findings.
- [ ] Store Finding evidence mappings.

### Content Action Generation

- [ ] Implement FindingType → ContentActionType mapping.
- [ ] Generate normalized ContentAction records.
- [ ] Use LLM to generate user-friendly action title and recommendation.
- [ ] Store ContentAction mappings.
- [ ] Dedupe similar Content Actions.
- [ ] Prioritize Content Actions by impact/effort/severity.

### Testing

- [ ] Unit test mention extraction.
- [ ] Unit test citation extraction.
- [ ] Unit test source classification.
- [ ] Unit test AnswerSignal creation.
- [ ] Unit test metric aggregation.
- [ ] Unit test each Finding rule.
- [ ] Unit test ContentAction generation.
- [ ] Integration test full AnalysisJob pipeline.
- [ ] Test partial scan handling.
- [ ] Test failed analysis retry handling.

## Ready

- [ ] Implement AnalysisJob lifecycle.
- [ ] Implement initial AnswerSignal extraction service.
- [ ] Implement initial Mention/Citation persistence.

## In Progress

_None yet._

## Done

- [x] Phase 3 pipeline selected: staged pipeline.
- [x] AnswerSignal will be stored.
- [x] Mentions include Brand, Competitor, Product, and meaningful Other.
- [x] MentionPosition and RecommendationStrength will be stored.
- [x] Sentiment stored on Mention and AnswerSignal.
- [x] Explicit citations and mentioned sources will be stored.
- [x] Source classification is brand-contextual.
- [x] Scan-level aggregate metrics will be stored.
- [x] Finding generation approach is hybrid rules + LLM explanation.
- [x] V1 Finding types locked.
- [x] V1 ContentAction types locked.
- [x] Content Briefs deferred.
