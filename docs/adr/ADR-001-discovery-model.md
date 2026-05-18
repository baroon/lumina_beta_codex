# ADR-001 — Discovery Model

## Status

Accepted / Locked.

## Date

2026-05-15

## Context

Phase 1 Discovery gets a new user from brand input to confirmed scan ingredients. The target users are SMB/founder-led teams and content marketing teams. They should not need to understand internal taxonomy or scan architecture during onboarding.

The product must gather enough structured data to generate meaningful prompts and later findings, while keeping the user experience simple and suggestion-first.

## Decision summary

We will use a **single combined Discovery confirmation screen** with grouped sections and inline editing.

The system will:

```text
1. Ask for brand name, website URL, and market.
2. Run a basic website crawl.
3. Extract finite candidate concepts.
4. Supplement with static templates and LLM/search where appropriate.
5. Present grouped suggestions to the user.
6. Require the user to review the screen once.
7. Treat user confirmation as the trusted source of truth.
```

High-confidence suggestions may be preselected, but confirmation finalizes them.

## User-facing flow

```text
1. Add Brand
2. Website crawl / brand understanding
3. Confirm extracted suggestions on one combined screen
4. Ready to create Visibility Tracker
```

The confirmation screen is grouped by:

```text
Brand details
Products / services
Audience
Market
Topics
Competitors
Trust signals
```

Do not introduce Project, Focus Area, Coverage, Opportunity, Workflow, or taxonomy language in Phase 1 UI.

## Source-of-truth principle

```text
Website crawl = brand-specific suggestions
Static system data = testing framework and normalization support
LLM/search = supplemental suggestion generation
User confirmation = trusted source of truth
```

## Website crawl scope

The crawl is not a full SEO audit. It is only for brand understanding and prompt-generation ingredients.

Default crawl behavior:

```text
Max pages: 25 same-domain pages
Prioritize homepage, about, product/service, pricing, FAQ/support, contact, and sitemap-discovered pages
Retry crawl on failure
Allow manual fallback if crawl fails or is incomplete
Store extracted text in object storage
Store structured extraction in DB
Keep crawl snapshots for traceability
```

Do not include in v1 crawl:

```text
Full technical SEO audit
Keyword ranking analysis
Backlink analysis
Traffic analysis
Conversion analysis
Core Web Vitals
Large-scale site crawl
Full content inventory
Log-file analysis
```

## Extracted concepts

The crawl/extraction pipeline should produce candidates for a finite set of concepts:

```text
BrandProfile
Product / Service
Audience
Market
Topic
Competitor
TrustSignal
```

ExistingPage/page inventory is deferred from v1.

## Concept: BrandProfile

Purpose:

```text
Describe what the brand does and provide base context for prompts and reports.
```

Fields:

```text
BrandName
WebsiteUrl
ShortDescription
Industry
Category
Positioning
ConfidenceScore
SourcePages
Status
```

ToneOfVoice and PrimaryOfferingSummary are removed from v1 BrandProfile.

Extraction sources:

```text
User input
title tag
meta description
Open Graph tags
Organization schema
homepage hero/about copy
homepage H1/H2
footer/copyright
```

Required/recommended:

```text
BrandName: required
WebsiteUrl: required
ShortDescription: recommended
Industry/category: recommended
Positioning: optional/recommended
```

Fallbacks:

```text
Use user-provided BrandName as source of truth.
If description confidence is low, ask user to edit/add description.
If industry/category unclear, show suggestions from taxonomy or allow Unknown/Other.
```

## Concept: Product / Service

Purpose:

```text
Identify what the brand offers so prompts can be specific.
```

Fields:

```text
Name
Description optional
ProductType
RelatedPageUrl optional
Source
ConfidenceScore
Status
```

ProductType examples:

```text
Product
Service
Feature
Solution
Tool
Resource
Unknown
```

Extraction sources:

```text
Navigation labels
Product/service pages
Homepage sections
Sitemap URLs
Pricing page
Feature sections
Page titles
Meta descriptions
H1/H2 headings
```

Fallbacks:

```text
If no product/service is confidently detected, use Category as fallback.
If still unclear, ask the user to add product/service manually.
```

Prompt-generation role:

```text
Used for specific prompts, e.g. "best resume builder" instead of "best career tool".
```

## Concept: Audience

Purpose:

```text
Identify who the brand/product is meant for.
```

Fields:

```text
Name
Description optional
Source
ConfidenceScore
Status
```

Extraction sources:

```text
Homepage copy
"For X" sections
Solution pages
Case studies
Testimonials
Page titles
H1/H2 headings
Blog categories
Pricing/package labels
```

Audience is optional in v1.

Fallbacks:

```text
If no clear audience is found, leave blank.
Use product/category/market for prompt generation.
Suggest industry-template audiences as optional, not auto-active.
```

## Concept: Market

Purpose:

```text
Define geography/language context for prompt generation and scan interpretation.
```

Market is required in v1 and must be user-confirmed.

Fields:

```text
Name
MarketType
CountryCode optional
Region optional
City optional
LanguageCode
CurrencyCode optional
IsCustom
Source
ConfidenceScore
Status
```

MarketType:

```text
Country
Region
City
MultiCountry
Global
Custom
```

Extraction sources:

```text
User input
contact page/footer address
phone country code
currency
hreflang tags
country-specific URLs
TLD
schema Organization/LocalBusiness
language of site content
```

Decision:

```text
Use normalized country/language/currency where possible, but allow custom named markets.
```

TODO:

```text
Create Market reference data: countries, languages, currencies, common regions, common multi-country markets, and custom market support.
```

## Concept: Topic

Purpose:

```text
Define the subject being tested.
```

Topic is user-facing and replaces the earlier Theme naming.

Fields:

```text
Name
Description optional
TopicType optional
Source
ConfidenceScore
Status
Aliases optional
```

Topic behavior:

```text
Suggested from website crawl
Suggested from industry/category templates
Editable by user
Free-form allowed
Lightly normalized with aliases
Not forced into a rigid taxonomy
```

Examples:

```text
Pricing
Customer Support
ATS Compatibility
Cancellation / Refunds
Security
Integrations
Implementation Time
```

Distinction:

```text
Topic = what subject we test
Visibility Check = what kind of visibility gap we test for
```

Example:

```text
Topic: Pricing
Visibility Check: Sentiment & Trust
Prompt: Is Brand X worth the price?
```

Fallbacks:

```text
If crawl confidence is low, suggest generic and industry-specific topics.
At least one Topic is required for Discovery completion.
```

## Concept: Competitor

Purpose:

```text
Identify brands/companies to compare against in AI answers.
```

Fields:

```text
Name
Domain optional
Description optional
Source
ConfidenceScore
Status
```

Competitor source priority:

```text
1. User-provided competitors
2. Search + LLM competitor discovery
3. LLM-only fallback
4. AI answer discovery after future scans
5. Website crawl only if obvious
```

Website crawl is supplemental only and often weak for competitor discovery.

Competitors must always be user-confirmed.

If no competitors are selected:

```text
Skip competitor comparison prompts in Phase 2.
Do not block Discovery completion.
```

## Concept: TrustSignal

Purpose:

```text
Detect trust/support/pricing/legal signals that may influence sentiment prompts and later findings.
```

TrustSignal is finite and controlled in v1.

Fields:

```text
SignalType
Name
Description optional
Source
ConfidenceScore
Status
SourcePages
```

Suggested v1 TrustSignal types:

```text
Pricing Transparency
Refund Policy
Cancellation Policy
Customer Support
Privacy Policy
Security
Compliance / Certifications
Reviews / Ratings
Testimonials
Case Studies
Guarantee / Warranty
Contact Availability
Company / About Information
Terms of Service
```

Status values:

```text
Detected
NotDetected
UserConfirmed
UserDismissed
```

Important rule:

```text
If a signal is not found, say "not detected on crawled pages", not "missing".
```

## Visibility Checks and Prompt Library are static system data

Visibility Checks are not extracted from crawl. They are predefined product capabilities used later in Phase 2.

V1 Visibility Checks:

```text
Discovery
Buying Intent
Competitor Comparison
Sentiment & Trust
Citation Visibility
Content Gaps
```

Prompt Library/Templates are also static system assets. They are used in Phase 2 to suggest prompts using Discovery-confirmed ingredients.

## Confidence policy

Confidence thresholds are configurable per concept.

Default thresholds:

```text
BrandProfile: 0.80
Product/Service: 0.75
Audience: 0.70
Market: user-confirm required
Topic: 0.65
Competitor: user-confirm required
TrustSignal: 0.75
```

Behavior:

```text
High confidence: can be preselected
Medium confidence: show as suggested
Low confidence: show under weaker suggestions or leave blank
User confirmation overrides confidence and finalizes the value
```

## Normalization policy

Use alias-based soft normalization.

Examples:

```text
Pricing / Cost / Fees / Subscription Plans
Cancellation / Cancel account / Refunds
Customer Support / Help / Support Team
```

Rules:

```text
Suggest merges for likely duplicates.
Do not aggressively auto-merge user-created items.
Preserve user language where possible.
```

## Required / recommended / optional classification

```text
Brand name: Required
Website URL: Required
Market: Required and user-confirmed
Brand description: Recommended
Industry/category: Recommended
Product/service: Recommended
Topic: Recommended and at least one required
Competitor: Optional
Audience: Optional
TrustSignal: System-only / optional user visibility
```

Discovery completion criteria:

```text
Brand name confirmed
Website URL confirmed
Market confirmed
At least one Product/Service or Category exists
At least one Topic exists
Discovery screen reviewed
```

## Re-discovery behavior

Users can rerun Discovery later.

Rules:

```text
Create a new crawl snapshot.
Show changes as suggestions.
Do not overwrite user-confirmed values automatically.
User decides what to accept.
```

## Storage decisions

Store:

```text
Structured extracted data in DB
Extracted page text in object storage
Crawl snapshots for traceability
Source pages/evidence references per extracted item
```

Do not store:

```text
Full technical crawl/audit data beyond Phase 1 needs
Deep page inventory / ExistingPage mapping in v1
```

## Phase 1 output contract

Phase 1 hands Phase 2:

```text
Confirmed BrandProfile
Confirmed Market
Confirmed Products/services or Category
Confirmed Topics
Confirmed Competitors, if any
Optional Audiences
Detected TrustSignals
Discovery confirmation metadata
Crawl snapshot references
```

Phase 2 consumes this to create:

```text
Visibility Tracker / TrackerConfiguration
Backend Coverage
Draft prompts
Prompt mappings
```

## Consequences

Benefits:

```text
Low-friction onboarding
Structured enough for prompt generation
User confirmation increases trust
Clear separation of crawl vs static system data vs user truth
Reusable for UI, backend, and agentic code generation
```

Tradeoffs:

```text
Requires extraction pipeline and confidence scoring
Requires reference/taxonomy data for industry/category/markets
Requires careful UI to avoid taxonomy overload
Competitor discovery needs search/LLM support rather than crawl alone
```
