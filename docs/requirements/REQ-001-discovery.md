# REQ-001 — Discovery Requirements

## 1. Goal

Discovery must get a user from brand input to confirmed scan ingredients with minimal friction.

## 2. User story

As a user, I want to enter my brand and website, have the system suggest what it understands about my brand, and confirm or correct those suggestions before creating a Visibility Tracker.

## 3. Inputs

Required initial inputs:

```text
Brand name
Website URL
Primary market or market confirmation
```

Optional initial inputs:

```text
Known competitors
Industry/category
Products/services
Audience
Topics
```

## 4. Crawl requirements

The system must run a basic website crawl after brand/website input.

Default crawl settings:

```text
Max 25 same-domain pages
Retry crawl on failure
Allow manual fallback
Prioritize homepage, about, product/service, pricing, FAQ/support, contact, sitemap-discovered pages
```

Crawl must collect:

```text
URL
Page title
Meta description
H1/H2 headings
Main extracted text
Open Graph metadata where available
Schema.org metadata where available
Internal links needed for crawl priority
Source evidence for extracted candidates
```

Crawl must not perform full SEO audit in v1.

## 5. Extraction requirements

The extraction pipeline must produce candidate entities for:

```text
BrandProfile
Product / Service
Audience
Market
Topic
Competitor
TrustSignal
```

Each extracted candidate must include:

```text
Value/name
Description where applicable
Concept type
Source
Source page URL(s)
Confidence score
Status
```

## 6. Confirmation screen requirements

The Discovery confirmation screen must be one combined page with grouped editable sections.

Sections:

```text
Brand details
Products / services
Audience
Market
Topics
Competitors
Trust signals
```

User must be able to:

```text
Confirm preselected suggestions
Select/unselect suggestions
Edit suggested values
Add custom values
Ignore suggestions
Proceed only after reviewing the screen
```

High-confidence suggestions may be preselected.

## 7. BrandProfile requirements

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

Requirements:

```text
BrandName and WebsiteUrl are required.
ShortDescription is recommended.
Industry/category are recommended.
Positioning is optional/recommended.
ToneOfVoice and PrimaryOfferingSummary are not part of v1 BrandProfile.
```

## 8. Product / Service requirements

Product/service suggestions must be extracted from site structure and content.

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

Product/service is recommended. If missing, Category may be used as fallback.

## 9. Audience requirements

Audience suggestions are optional.

Fields:

```text
Name
Description optional
Source
ConfidenceScore
Status
```

If no clear audience is detected, leave blank and allow prompt generation without audience.

## 10. Market requirements

Market is required and must be user-confirmed.

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

Market must support normalized and custom values.

MarketType:

```text
Country
Region
City
MultiCountry
Global
Custom
```

## 11. Topic requirements

Topic is user-facing and free-form/suggestion-first.

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

At least one Topic is required for Discovery completion.

Topics are not a rigid taxonomy. They may be suggested from crawl/templates and edited by the user.

## 12. Competitor requirements

Competitor discovery must primarily use user input + search/LLM suggestions.

Source priority:

```text
UserAdded
SearchSuggested
LLMSuggested
AnswerDiscovered later
WebsiteCrawl supplemental only
```

Competitors must always be user-confirmed.

No competitors selected must not block Discovery completion.

## 13. TrustSignal requirements

TrustSignals use a finite controlled list.

V1 signal types:

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

If not detected, status must be `NotDetected`; do not claim missing.

## 14. Confidence and selection requirements

Confidence thresholds must be configurable per concept.

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

User confirmation finalizes the item regardless of original confidence.

## 15. Normalization requirements

The system must support alias-based soft normalization.

Rules:

```text
Suggest duplicate/alias merges.
Do not aggressively auto-merge user-created items.
Preserve user-facing wording unless user accepts merge.
```

## 16. Completion requirements

Discovery is complete when:

```text
Brand name confirmed
Website URL confirmed
Market confirmed
At least one Product/Service or Category exists
At least one Topic exists
Discovery screen reviewed
```

## 17. Re-discovery requirements

User must be able to rerun Discovery later.

Rules:

```text
Create new crawl snapshot.
Show new/changed values as suggestions.
Do not overwrite user-confirmed values automatically.
```

## 18. Storage requirements

Store in DB:

```text
Structured extracted candidates
Confirmed entities
Confidence/source/status metadata
Crawl snapshot metadata
```

Store in object storage:

```text
Extracted page text
Optional raw crawl/extraction artifacts
```

## 19. Out of scope

```text
ExistingPage/page inventory mapping
Full SEO audit
Keyword ranking
Backlink analysis
GSC/GA integration
CMS integration
Prompt generation execution details
Scan runs
Findings/content actions
Reports
```
