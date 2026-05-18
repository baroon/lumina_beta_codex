# ARCH-007: AI Provider and LLM Orchestration

## AI Platform Abstraction

Use adapter pattern per provider/platform and a resolver/factory.

```text
Application layer
→ IAIPlatformClientResolver
  → IAIPlatformClient
    → OpenAIChatGptClient
    → OpenAIChatGptSearchClient
    → GeminiClient
    → ClaudeClient
```

## Rules

- Provider-specific logic lives in Infrastructure.
- PromptRun worker uses resolver/factory.
- No provider-specific branching inside application workflow code.
- Raw provider response is stored unchanged in Blob Storage.
- Clean answer text and normalized metadata are stored in PostgreSQL.

## Normalized Response

Must include:

- Answer text
- Raw response blob key
- Citations where available
- Provider metadata
- Error classification where applicable

## LLM / Extraction Orchestration

Use task-specific extractor/generator services.

Examples:

- IBrandProfileExtractor
- IProductServiceExtractor
- IAudienceExtractor
- ITopicExtractor
- ITrustSignalDetector
- ICompetitorSuggestionService
- IPromptGenerationService
- IAnswerSignalExtractor
- IFindingNarrativeGenerator
- IContentActionGenerator

Pattern:

```text
Handler / Worker
→ Extractor or Generator Service
→ ILlmClient
→ Structured DTO response
→ Validation
→ Persistence
```

## Rules

- Use structured LLM outputs.
- Prompts are centralized and versioned.
- LLM responses are validated before persistence.
- Store confidence and evidence.
- Failures return partial/low-confidence results where possible.
- Controllers and handlers must not contain inline prompts.
