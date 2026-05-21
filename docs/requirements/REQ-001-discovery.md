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
Max 10 same-domain pages
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

Discovery uses a **staged extraction model**:

- The initial crawl-based extraction produces candidates for **BrandProfile, Product / Service, Audience, Market, and TrustSignal**.
- **Topic** and **Competitor** candidates are NOT produced by the initial crawl. They are generated during the confirmation wizard (see §6 "In-wizard refinement"), using the user's confirmed industry/category, products, audiences, and markets as context to improve accuracy.

Across both stages the pipeline must produce candidate entities for:

```text
BrandProfile      (initial extraction)
Product / Service (initial extraction)
Audience          (initial extraction)
Market            (initial extraction)
TrustSignal       (initial extraction)
Topic             (generated during confirmation from confirmed context)
Competitor        (generated during confirmation from confirmed context)
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

The Discovery confirmation screen is a guided multi-step wizard. The final step
is a combined, editable review of every section before the user confirms.

Wizard steps:

```text
1. Brand Identity        — brand profile fields, each with per-field source attribution, inline editable
2. Products              — products / services
3. Audiences & Markets   — target audiences and markets
4. Competitive Landscape — topics, competitors, trust signals
5. Review & Confirm      — combined summary of all sections; "Edit" jumps back to the relevant step
```

User must be able to:

```text
Confirm preselected suggestions
Select/unselect suggestions
Edit suggested values
Add custom values
Ignore suggestions
Review every section (the Review & Confirm step) before completing
```

High-confidence suggestions are preselected (see §14).

### In-wizard refinement

The confirmation flow supports iterative refinement (distinct from full
re-discovery in §17):

```text
Resuggest      — advancing past Audiences & Markets re-derives Topics and Competitors
                 from the confirmed products, audiences, and markets.
Refresh lens   — each lens (products, audiences, markets, topics, competitors,
                 trust signals) offers a "Refresh suggestions" action that
                 regenerates that lens, limited to 3 refreshes per lens.
```

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

ProductType controlled list:

```text
Product
Service
Feature
Solution
Tool
Resource
Unknown
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
Source
ConfidenceScore
Status
Aliases optional
```

At least one Topic is required for Discovery completion.

Topics are not a rigid taxonomy. They are generated during the confirmation
wizard from the user's confirmed context (industry/category, products,
audiences, markets) and remain editable by the user.

## 12. Competitor requirements

Competitor discovery must primarily use user input + search/LLM suggestions.
Like topics, competitor candidates are generated during the confirmation wizard
from the user's confirmed context, not from the initial crawl.

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

TrustSignals use a finite controlled list of curated categories.

V1 signal types (enum name in parentheses):

```text
Awards & Recognitions          (AwardsAndRecognitions)
Certifications & Accreditations (CertificationsAndAccreditations)
Press & Media Mentions         (PressAndMediaMentions)
Testimonials & Reviews         (TestimonialsAndReviews)
Expert Endorsements            (ExpertEndorsements)
Case Studies & Success Metrics (CaseStudiesAndSuccessMetrics)
Client & Partner Logos         (ClientAndPartnerLogos)
```

TrustSignals follow the same candidate lifecycle as every other concept
(`Suggested` → `Confirmed` / `Dismissed`); there is no separate `NotDetected`
status. An undetected signal simply produces no candidate rather than a
"missing" claim.

When a user adds a custom trust signal, a signal type from the list above must
be selected.

## 14. Confidence and selection requirements

A single set of confidence thresholds applies uniformly across all concepts.
Each candidate maps to one of three confidence levels:

```text
High:   confidence >= 0.70
Medium: confidence >= 0.40 and < 0.70
Low:    confidence < 0.40
```

High-confidence candidates are preselected in every lens (products, audiences,
markets, topics, competitors, trust signals). Medium- and low-confidence
candidates are shown but not preselected.

User confirmation (or deselection) finalizes the item regardless of its
original confidence.

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
