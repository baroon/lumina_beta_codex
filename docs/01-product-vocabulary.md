# Product Vocabulary

## Use these user-facing terms

| Term | Definition |
|---|---|
| Workspace / Account | Tenant/account boundary. |
| Brand | Business/product/website being tracked. |
| Visibility Tracker | Saved setup that monitors how AI platforms mention, compare, cite, and recommend a brand. |
| Scan Run | One execution of a Visibility Tracker. |
| Topic | Subject being tested, such as Pricing, Support, Security, ATS Compatibility. |
| Visibility Lens | Predefined type of AI visibility test, such as Discovery or Buying Intent. |
| Prompt | Question asked to AI platforms. |
| Finding | Evidence-backed issue, strength, risk, or opportunity found from the scan. |
| Content Action | Recommended action to improve AI visibility. |
| Source | Website/domain/source cited or mentioned by an AI answer. |
| Citation | Source reference from an AI answer. |
| Report | Downloadable/shareable summary of scan results. |

## Avoid these in v1 UI

- Project
- Prompt Set
- Focus Area
- Opportunity
- Insight
- Workflow
- Coverage
- Prompt-to-dimension mapping
- Scan Configuration
- Prompt Run

## Internal/backend terms

| Internal term | User-facing term |
|---|---|
| TrackerConfiguration | Visibility Tracker |
| ScanRun | Scan Run |
| PromptRun | Scan Check, hidden except progress count |
| Topic | Topic |
| VisibilityLens | Visibility Lens |
| Finding | Finding |
| ContentAction | Content Action |
| AnswerSignal | Hidden analysis summary |
| Mention | Evidence detail |
| Citation | Evidence detail |

## Final naming decisions

- Use **Visibility Tracker**, not Project or Visibility Scan.
- Use **Topic**, not Theme.
- Use **Finding**, not Insight.
- Use **Content Action**, not Opportunity.
- Use **Prompt**, not Query.
- Use **Scan Check** in progress UI to represent `1 prompt × 1 AI platform`.
