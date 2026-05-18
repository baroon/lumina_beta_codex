# ARCH-008: Website Discovery Crawler

## Decision

Use a two-speed discovery model.

## Fast Discovery

Fast Discovery is client-facing and must feel near-instant.

Implementation:

- Async, low-latency, API-orchestrated
- Not forced through Service Bus / MassTransit message queue
- Dispatched as Hangfire fire-and-forget job from the API controller
- Backed by DiscoveryRun persisted in DB
- Live progress via SignalR (pages discovered, extraction status streamed to client)
- Returns partial results if needed
- Manual fallback always available

Technology:

- C# / .NET
- HttpClientFactory
- AngleSharp
- Lightweight HTTP + HTML parsing
- No Playwright by default

Target:

- 5–10 high-value pages
- 15–30 second experience target

Prioritized pages:

- Homepage
- About
- Product/service
- Pricing
- FAQ/support
- Contact
- Sitemap-discovered top pages

## Background Enrichment

Background enrichment is non-blocking and durable.

Implementation:

- MassTransit queued job (Azure Service Bus in prod, RabbitMQ locally)
- Retryable with dead-letter handling
- Used after onboarding or tracker creation

Purpose:

- Deeper crawl
- Improved topic/trust/audience suggestions
- More complete extraction

## Fallbacks

Use Playwright only if:

- Site is JS-heavy
- Static HTML has too little content
- Important pages cannot be parsed

Python worker/service is allowed later for advanced data science, clustering, NLP, enrichment, and embeddings.

## Interfaces

Keep crawler/extraction behind interfaces:

- IWebsiteDiscoveryService
- IContentExtractor
- ICompetitorSuggestionService
- ITopicSuggestionService
