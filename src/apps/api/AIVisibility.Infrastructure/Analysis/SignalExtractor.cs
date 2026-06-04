using System.Text;
using System.Text.Json;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// LLM-driven extractor that turns one <see cref="AIAnswer"/> into structured
/// signal + mention + citation rows (Phase 3 plan §2 D5/D6/D8). One OpenAI
/// call per answer returns a JSON envelope with all three; this class parses
/// the envelope, resolves LLM-named entities against the tracker's tracked
/// universe (D12/D18/D19), classifies citations by URL-domain match
/// (D14 Option A), and post-processes <c>AnswerSignal</c> source counts (D11).
///
/// Concrete class (not behind an interface) per D8 — <see cref="IOpenAiService"/>
/// is the test seam. Per-answer failures return null so the calling job can
/// catch-and-continue with siblings (D3).
/// </summary>
public class SignalExtractor
{
    private readonly IOpenAiService _openAi;
    private readonly ILogger<SignalExtractor> _logger;

    public SignalExtractor(IOpenAiService openAi, ILogger<SignalExtractor> logger)
    {
        _openAi = openAi;
        _logger = logger;
    }

    private const string SystemPrompt = """
        You are an analyst extracting structured signals from an AI assistant's answer
        about a specific brand and its market. Return ONLY a single JSON object — no
        prose, no markdown fences. The JSON must match this exact schema:

        {
          "answer_signal": {
            "brand_mentioned": bool,
            "brand_recommended": bool,
            "brand_rank": int|null,          // 1-based rank in any ranked list; null otherwise
            "brand_rank_universe_size": int|null, // total entries in that ranked list; null when brand_rank is null
            "brand_sentiment": "Positive|Neutral|Negative|Mixed|Unknown",
            "brand_sentiment_score": number, // -1.0..+1.0; finer-grained than the enum. See sentiment-score rules below.
            "brand_recommendation_strength": "Strong|Moderate|Weak|NotRecommended|Unknown",
            "brand_recommendation_score": number, // -1.0..+1.0; finer-grained than the strength enum. See recommendation-score rules below.
            "top_recommended_entity": string|null,
            "recommended_entities": [string],  // ordered top-first; full list of recommended entities (any type — brand/competitor/product/other), see rules below
            "answer_has_ranking": bool,
            "answer_has_comparison": bool,
            "answer_has_citations": bool,
            "confidence_score": number,      // 0.0-1.0 — YOUR confidence in this extraction
            "answer_certainty": number       // 0.0-1.0 — how confidently the answer ITSELF states its claims
          },
          "mentions": [
            {
              "entity_type": "Brand|Competitor|Product",
              "name": string,                // exact mention text from the answer
              "is_recommended": bool,
              "recommendation_strength": "Strong|Moderate|Weak|NotRecommended|Unknown",
              "recommendation_score": number, // -1.0..+1.0; finer-grained than the strength enum. See recommendation-score rules below.
              "sentiment": "Positive|Neutral|Negative|Mixed|Unknown",
              "sentiment_score": number,     // -1.0..+1.0; finer-grained than the enum. See sentiment-score rules below.
              "evidence_snippet": string,    // ≤500 chars; quoted sentence(s) from the answer
              "confidence_score": number,    // 0.0-1.0
              "attributes": [                // qualities the answer ascribes to THIS entity. See attribute rules below. May be [].
                {
                  "name": string,            // e.g. "in-depth analysis", "slow to break news"
                  "polarity": "Positive|Neutral|Negative",
                  "evidence_snippet": string,
                  "confidence_score": number
                }
              ],
              "factual_claims": [            // check-able facts the answer asserts ABOUT THIS entity. See factual-claim rules below. May be [].
                {
                  "claim_text": string,
                  "subject": string,         // normalized snake_case category, e.g. "founding_year", "parent_company"
                  "asserted_value": string,
                  "evidence_snippet": string,
                  "verifiability": "Verifiable|Subjective|Unverifiable",
                  "confidence_score": number
                }
              ],
              "risk_flags": [                // concerns / criticisms / warnings the answer surfaces about THIS entity. See risk-flag rules below. May be [].
                {
                  "flag_type": string,       // canonical snake_case label: "layoffs", "lawsuit", "outage", "controversy", "security_incident", "regulatory", "defect", "leadership_change", etc.
                  "severity": "Low|Medium|High",
                  "evidence_snippet": string
                }
              ],
              "comparisons": [               // head-to-head comparisons this entity is part of in the answer. See comparison rules below. May be [].
                {
                  "vs_entity": string,       // the entity being compared against, name verbatim from the answer
                  "on_aspect": string,       // canonical snake_case aspect: "price", "speed", "support_quality", "ease_of_use", etc.
                  "winner": "this|other"     // who the answer says wins THIS aspect — this entity or the other
                }
              ],
              "recommended_for": [string],   // scenarios / audiences / use-cases the answer endorses THIS entity FOR. See recommendation-context rules. May be [].
              "with_caveats": [string]       // limitations / caveats the answer attaches to THIS entity. See recommendation-context rules. May be [].
            }
          ],
          "citations": [
            {
              "source_name": string,         // e.g. "Trustpilot", "G2", "Acme blog"
              "url": string|null,            // see citation rules below for when null is allowed
              "confidence_score": number     // 0.0-1.0
            }
          ]
        }

        Citation rules:
        - If the answer contains a URL or markdown link for a source, the citation's
          "url" MUST be that URL (verbatim, including scheme).
        - "url" may be null ONLY when the answer names a source without any URL
          (e.g. "according to Trustpilot" with no link). This is the
          mentioned-source case — do not invent a URL.
        - Do not paraphrase or shorten URLs. If the answer says
          "https://example.com/path?q=1", emit exactly that.
        - Source classification (Owned vs Competitor vs ThirdParty) is computed
          downstream from the URL host, so omitting a URL that exists in the
          answer turns useful classification signal into Unknown — only emit
          null when there really is no URL in the source text.

        Rank rules (brand_rank, answer_has_ranking):
        - answer_has_ranking=true means the answer presents a ranked or ordered
          list of entities. Bulleted lists without order are NOT rankings.
        - When answer_has_ranking=true AND the tracked brand appears in that
          ranked list, brand_rank MUST be the brand's 1-based position. Do not
          leave it null in that case — extracting the position is the whole
          point of the field.
        - Examples:
            "1. Acme  2. Lumina  3. Beta"               -> brand_rank = 2 (if Lumina is the tracked brand)
            "Top picks: Lumina, Acme, Beta"             -> brand_rank = 1
            "The top three are: Acme, Beta, Charlie"    -> brand_rank = null (brand not in list)
            "Lumina, Acme, and Beta are all good"       -> brand_rank = null (not ordered)
        - When answer_has_ranking=false, brand_rank MUST be null.

        Rank-universe rules (brand_rank_universe_size):
        - When brand_rank is set, brand_rank_universe_size MUST be the total
          number of entries in that ranked list — the denominator that gives
          the rank meaning ("3 of 5" reads very differently from "3 of 50").
        - Count distinct ranked entries only (skip duplicates / parenthetical
          aliases). If the answer says "Top 5 are: A, B, C, D, E", the
          universe size is 5 regardless of how many are paraphrased later.
        - When brand_rank is null, brand_rank_universe_size MUST also be null.
        - If the answer ranks the brand but doesn't enumerate the full list
          (e.g. "Lumina is ranked 3rd on AlternativeTo.net"), set
          brand_rank_universe_size to null — don't guess.

        Recommended-entities list rules (recommended_entities):
        - Ordered top-first list of EVERY entity the answer recommends as a
          good option. Recommendation = positive endorsement or top-pick framing.
          Include entities of ANY type (brand, competitor, product, or a name
          we do not track yet).
        - Recommendation list rules:
          - Position 1 = the most-recommended entry (the AI top pick).
          - Subsequent positions = progressively weaker endorsements.
          - Use names EXACTLY as the answer wrote them (preserve casing).
          - Skip entities mentioned only for context (e.g. comparison foils).
          - When the answer presents multiple roughly-equal options, still list
            them in the order the answer named them.
          - Empty list (not null) when the answer recommends nothing.
        - Length cap: 20 entries. Truncate longer lists; rare in practice.
        - The first element of this list (if any) is the same as
          top_recommended_entity. Both fields MUST be consistent.

        Top-recommended-entity rules (top_recommended_entity):
        - When the answer endorses ONE entity as the clear top pick (above all
          others mentioned), top_recommended_entity MUST be that entity's name
          exactly as written — regardless of whether it's the tracked brand or
          a competitor.
        - When the answer treats multiple entities as roughly equal options
          (e.g. "X, Y, and Z are all strong choices") OR doesn't endorse any
          single entity, top_recommended_entity MUST be null.
        - Examples:
            "I'd recommend Acme as the best option"     -> "Acme"
            "Lumina is my #1 choice"                    -> "Lumina"
            "Acme leads the pack, with Beta close behind" -> "Acme"
            "There are several good options: X, Y, Z"   -> null
            "It depends on your needs"                  -> null
        - If brand_rank=1 (the tracked brand is ranked #1), top_recommended_
          entity MUST be the tracked brand's name — those two fields cannot
          disagree.

        Factual-claim rules (mention.factual_claims):
        - Extract check-able facts the answer asserts ABOUT this entity. Things you
          could look up in Wikipedia, on the entity's own site, or via search:
          founding year, parent company, ownership, headquarters, leadership,
          product category, key features, pricing tier, awards, partnerships,
          headcount, subscribers/users, languages supported.
        - Skip: opinions, recommendations, sentiment, comparative framing, generic
          praise. Those are captured by sentiment + attributes; mixing them in
          here pollutes the fact-check inbox.
        - claim_text: the full claim as a self-contained sentence, ≤1000 chars.
        - subject: a short snake_case category for grouping. Use these when they
          fit; coin a new one only if none match:
            founding_year, parent_company, headquarters, leadership,
            product_category, product_feature, price, award, partnership,
            ownership, headcount, audience_size, languages, distribution.
        - asserted_value: the specific value being asserted, ≤500 chars
          ("1975", "Living Media India", "New Delhi", "subscription model").
        - verifiability:
            Verifiable -- a public fact you could look up
            Subjective -- opinion-shaped ("widely regarded as", "considered trusted")
            Unverifiable -- speculative or future-tense ("will likely IPO next year")
        - When the answer asserts nothing factual about an entity, return [].

        Recommendation-context rules (mention.recommended_for, mention.with_caveats):
        - recommended_for captures scenarios / audiences / use-cases the
          answer endorses THIS entity FOR. Each entry is a short noun phrase:
            "investigative journalism"
            "small teams"
            "enterprise security"
            "developers who value performance"
        - with_caveats captures limitations / contexts where the answer is
          NOT endorsing the entity:
            "not for breaking news"
            "expensive at scale"
            "limited mobile support"
            "steeper learning curve"
        - Each list is independent of sentiment and recommendation strength.
          A NotRecommended entity can still have a recommended_for (rare —
          the answer might say "only useful for niche X"). A Strong entity
          can still have caveats.
        - 3-15 words per entry; keep it specific. Drop generic entries like
          "general use" or "everyone".
        - Normalize lightly: lowercase first word unless proper noun,
          collapse whitespace. The extractor downstream lowercases for
          grouping.
        - Empty lists when the answer is purely overall ("X is great").

        Comparison rules (mention.comparisons):
        - One row per (this entity, vs_entity, on_aspect) tuple where the
          answer DIRECTLY compares the two on that specific dimension.
            "X is faster than Y"            -> 1 row: vs=Y, aspect=speed, winner=this
            "Y has better support than X"   -> 1 row on X mention: vs=Y, aspect=support_quality, winner=other
            "X and Y are similar on price"  -> 0 rows (no winner)
            "X is generally better"         -> 0 rows (no aspect)
        - Aspect MUST be snake_case from a small canonical set when possible:
          price, speed, performance, ease_of_use, support_quality, depth_of_coverage,
          accuracy, scalability, integrations, customization, reliability, security,
          pricing_transparency, mobile_experience, customer_base, brand_recognition.
          Use free-text (still snake_case) when none of these fit.
        - winner: "this" when THIS entity wins the aspect, "other" when the
          vs_entity wins. NEVER emit a row for a tie or ambiguous winner.
        - vs_entity is the EXACT name from the answer (preserve casing). The
          aggregator normalizes downstream.
        - Skip self-comparisons (this entity vs itself).
        - Empty list when nothing comparative.

        Risk-flag rules (mention.risk_flags):
        - One row per distinct concern / criticism / warning the answer
          raises about this entity. Concerns are INDEPENDENT of sentiment —
          a positive-sentiment answer ("X is widely recommended, but they
          had layoffs recently") still warrants a risk_flag against X.
        - flag_type MUST be a short snake_case canonical label. Prefer the
          curated vocabulary: layoffs, lawsuit, outage, controversy,
          security_incident, regulatory, defect, leadership_change,
          financial_decline, reliability, support_quality. Free-text is
          allowed when no canonical label fits — keep it ≤3 words.
        - severity:
            Low    Ambiguous concern, "some users reported", limited scope
            Medium Confirmed issue with limited blast radius ("known bug
                   with feature X")
            High   Material business risk: class-action, breach, recall,
                   regulatory action, mass layoffs
        - evidence_snippet ≤500 chars, quoted from the answer.
        - DO NOT emit a risk_flag for normal negative sentiment ("competitors
          are stronger") or for hypothetical concerns ("could be a concern if
          you need X"). The flag should be about something concrete the
          answer reports.
        - Empty list when nothing risky is mentioned about the entity.

        Attribute rules (mention.attributes):
        - Extract specific qualities the answer ascribes to the entity — things like
          "in-depth analysis", "slow to break news", "expensive", "user-friendly",
          "trustworthy", "limited mobile experience". Distinct adjectives or short
          noun-phrases describing the entity, NOT generic re-statements of recommendation.
        - polarity is independent of the entity's overall sentiment: an entity rated
          Positive overall can still carry Negative attributes ("reliable for analysis,
          BUT slow to break news" → "reliable for analysis" Positive, "breaking news"
          Negative). Capture the per-attribute stance, not the umbrella sentiment.
        - name MUST be a short, lowercase, normalized phrase (≤80 chars) — drop articles,
          collapse whitespace, no ending punctuation. "In-depth analysis" → "in-depth
          analysis"; "It is trustworthy." → "trustworthy".
        - evidence_snippet quotes the answer text that supports the attribute (≤500 chars).
        - Skip generic praise ("good", "great", "best") that doesn't name a specific quality —
          those are already captured by recommendation strength + sentiment.
        - Return [] when the answer doesn't ascribe specific qualities to the entity.

        Recommendation-score rules (brand_recommendation_score, mention.recommendation_score):
        - Score is a fine-grained reading of the recommendation_strength enum on
          a continuous -1.0..+1.0 axis.
        - Positive scores mean recommended; negative scores mean recommended-against.
        - Magnitude reflects strength:
            +0.9  Strong       ("the best", "top pick", unreserved endorsement)
            +0.5  Moderate     ("a solid choice with some caveats")
            +0.2  Weak         ("mentioned as an option among many")
             0.0  Unknown      (not discussed, or no recommendation signal)
            -0.7  NotRecommended ("avoid", "not recommended", "fails at X")
        - Score MUST be in [-1.0, +1.0]. Out-of-range values will be clamped.

        Answer-certainty rules (answer_certainty):
        - Measures HOW HEDGED the answer is, on a continuous 0.0..1.0 axis.
        - NOT the same as confidence_score (which is your confidence in this
          extraction). answer_certainty is about the LANGUAGE the AI used:
            1.0  Unequivocal: "X is THE best", "without question", "definitively"
            0.8  Strong: "X is widely regarded as the leader"
            0.6  Mostly confident with minor caveats: "X is generally the best,
                 though Y is competitive in some niches"
            0.5  Default / mixed framing (start here if unsure)
            0.3  Hedged: "X might be a good option", "could be worth considering"
            0.1  Heavily hedged: "it depends", "hard to say", "no clear best"
        - An answer can be both unmentioned-for-the-brand AND high-certainty
          (the AI was confident in talking about competitors); answer_certainty
          is INDEPENDENT of whether the tracked brand was mentioned.
        - Score MUST be in [0.0, 1.0]. Out-of-range values will be clamped.

        Sentiment-score rules (brand_sentiment_score, mention.sentiment_score):
        - Score is a fine-grained reading of the enum on a continuous -1.0..+1.0 axis.
        - Sign matches the enum: Positive enums score >0, Negative enums score <0,
          Neutral / Mixed / Unknown enums score near 0.
        - Magnitude reflects intensity:
            +0.9  "X is the gold standard / unequivocally the best"
            +0.6  "X is widely regarded as a strong choice"
            +0.3  "X is solid, with some caveats"
             0.0  Neutral / Mixed / Unknown
            -0.3  "X has notable weaknesses"
            -0.6  "X is generally not recommended"
            -0.9  "X has serious problems / actively harmful"
        - Mixed enums sit near 0: a balanced "great at A, weak at B" answer should
          score within roughly [-0.2, +0.2]; pick the sign by which side dominates.
        - Score MUST be in [-1.0, +1.0]. Out-of-range values will be clamped.

        Rules:
        - Absence is NOT negative. When brand_mentioned=false, ALL of the following MUST hold:
            brand_recommended = false
            brand_rank = null
            brand_rank_universe_size = null
            brand_sentiment = "Unknown"
            brand_sentiment_score = 0
            brand_recommendation_strength = "Unknown"
            brand_recommendation_score = 0
            top_recommended_entity = null (unless the answer explicitly names another top entity)
          Do NOT emit "Negative" or "NotRecommended" just because the brand isn't mentioned —
          those values mean the brand was actively discussed in a negative or against-it way.
        - Mention only what is in the answer. Do not infer entities not present.
        - "Brand" entity_type is for the tracked brand only.
        - "Competitor" and "Product" entity_types should use the names exactly as the answer
          phrases them (even if they don't appear in the tracked list — the caller resolves them).
        - Recommendation strength scale: Strong (top pick / unreserved), Moderate (with caveats),
          Weak (mentioned as an option), NotRecommended (the answer recommends against the entity),
          Unknown (entity not discussed, or strength cannot be inferred).
        - If the answer has no citations or sources, return citations: [].
        """;

    public async Task<SignalExtractionResult?> ExtractAsync(
        AIAnswer answer,
        SignalExtractionContext context,
        CancellationToken cancellationToken)
    {
        var userPrompt = BuildUserPrompt(answer, context);

        var raw = await _openAi.ChatCompletionAsync(
            SystemPrompt,
            userPrompt,
            maxTokens: 2048,
            temperature: 0.1,
            ct: cancellationToken);

        if (string.IsNullOrWhiteSpace(raw))
        {
            _logger.LogWarning("Signal extraction returned empty response for AIAnswer {AIAnswerId}", answer.Id);
            return null;
        }

        JsonElement root;
        try
        {
            root = ParseEnvelope(raw);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex,
                "Signal extraction JSON parse failed for AIAnswer {AIAnswerId}. Response prefix: {Prefix}",
                answer.Id, Truncate(raw, 200));
            return null;
        }

        try
        {
            var drafts = BuildDraftCitations(root, answer.Id, context).ToList();
            var (mentions, candidates, attributes, claims, riskFlags, comparisons, recommendationContexts) = BuildMentions(root, answer.Id, answer.AnswerText, context);
            var signal = BuildSignal(root, answer.Id, drafts);
            var recommendations = BuildAnswerRecommendations(root, answer.Id);
            return new SignalExtractionResult(signal, mentions, candidates, drafts, attributes, claims, recommendations, riskFlags, comparisons, recommendationContexts);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Signal extraction shape error for AIAnswer {AIAnswerId}",
                answer.Id);
            return null;
        }
    }

    private static string BuildUserPrompt(AIAnswer answer, SignalExtractionContext context)
    {
        var sb = new StringBuilder();
        sb.Append("Tracked brand: ").AppendLine(context.Brand.Name);
        if (!string.IsNullOrWhiteSpace(context.Brand.WebsiteUrl))
        {
            sb.Append("Brand website: ").AppendLine(context.Brand.WebsiteUrl);
        }
        if (context.Brand.Aliases.Count > 0)
        {
            sb.Append("Brand aliases: ").AppendLine(string.Join(", ", context.Brand.Aliases));
        }
        if (context.TrackedCompetitors.Count > 0)
        {
            sb.Append("Tracked competitors: ")
                .AppendLine(string.Join(", ", context.TrackedCompetitors.Select(c => c.Name)));
        }
        if (context.TrackedProducts.Count > 0)
        {
            sb.Append("Tracked products: ")
                .AppendLine(string.Join(", ", context.TrackedProducts.Select(p => p.Name)));
        }
        sb.AppendLine();
        sb.AppendLine("Answer to analyze:");
        sb.AppendLine("---");
        sb.AppendLine(answer.AnswerText);
        sb.AppendLine("---");
        return sb.ToString();
    }

    private static JsonElement ParseEnvelope(string raw)
    {
        // LLMs sometimes wrap JSON in markdown fences or prepend a sentence.
        // Trim to the outer object.
        var start = raw.IndexOf('{');
        var end = raw.LastIndexOf('}');
        if (start < 0 || end <= start)
        {
            throw new JsonException("No JSON object found in LLM response.");
        }
        var trimmed = raw.AsSpan(start, end - start + 1);
        using var doc = JsonDocument.Parse(trimmed.ToString());
        return doc.RootElement.Clone();
    }

    private AnswerSignal BuildSignal(JsonElement root, Guid aiAnswerId, IReadOnlyList<DraftCitation> citations)
    {
        var s = root.GetProperty("answer_signal");
        var now = DateTime.UtcNow;
        var brandMentioned = s.GetProperty("brand_mentioned").GetBoolean();

        // D13 absence invariant. The prompt instructs the LLM to emit Unknown
        // values when the brand isn't mentioned, but verify-e2e observed
        // gpt-4o-mini emitting NotRecommended/Negative on ~49% of unmentioned-
        // brand answers. Coerce here so downstream aggregation can't read those
        // as real negative-recommendation signal.
        var brandSentiment = brandMentioned
            ? ParseEnum<Sentiment>(s, "brand_sentiment", Sentiment.Unknown)
            : Sentiment.Unknown;
        var brandSentimentScore = brandMentioned
            ? ReadSentimentScore(s, "brand_sentiment_score", brandSentiment)
            : 0.0;
        var brandStrength = brandMentioned
            ? ParseEnum<RecommendationStrength>(s, "brand_recommendation_strength", RecommendationStrength.Unknown)
            : RecommendationStrength.Unknown;
        var brandRecommendationScore = brandMentioned
            ? ReadRecommendationScore(s, "brand_recommendation_score", brandStrength)
            : 0.0;
        var brandRank = brandMentioned ? TryGetNullableInt(s, "brand_rank") : null;
        // Universe size is null when the brand isn't ranked (no denominator
        // without a numerator). Also null when the LLM didn't emit it.
        var brandRankUniverseSize = brandRank.HasValue
            ? TryGetNullableInt(s, "brand_rank_universe_size")
            : null;
        var brandRecommended = brandMentioned && (TryGetBoolean(s, "brand_recommended") ?? false);

        return new AnswerSignal
        {
            Id = Guid.NewGuid(),
            AIAnswerId = aiAnswerId,
            BrandMentioned = brandMentioned,
            BrandRecommended = brandRecommended,
            BrandRank = brandRank,
            BrandRankUniverseSize = brandRankUniverseSize,
            BrandSentiment = brandSentiment,
            BrandSentimentScore = brandSentimentScore,
            BrandRecommendationStrength = brandStrength,
            BrandRecommendationScore = brandRecommendationScore,
            TopRecommendedEntity = TryGetNullableString(s, "top_recommended_entity"),
            AnswerHasRanking = s.GetProperty("answer_has_ranking").GetBoolean(),
            AnswerHasComparison = s.GetProperty("answer_has_comparison").GetBoolean(),
            AnswerHasCitations = s.GetProperty("answer_has_citations").GetBoolean(),
            // Phase 4 Slice 0: v1 URL-domain classifier produces Owned /
            // Competitor / Unknown only — "ThirdParty" was a v1 catch-all that
            // doesn't exist in the 12-value SourceType taxonomy. "URL present
            // but no match" → Unknown (per ADR-003), so ThirdPartySourceCount
            // is always 0 here. The aggregator buckets the more specific
            // SourceType values back into a ThirdParty reporting bucket once
            // LLM/KnownDomainList classification lands.
            OwnedSourceCount = citations.Count(c => c.ClassifiedAs == SourceType.Owned),
            CompetitorSourceCount = citations.Count(c => c.ClassifiedAs == SourceType.Competitor),
            ThirdPartySourceCount = 0,
            ConfidenceScore = TryGetDouble(s, "confidence_score") ?? 0.5,
            // Clamp to [0,1] — the prompt asks for the range but a fragile
            // LLM might emit -0.1 or 1.5. Default 0.5 (neutral) when omitted.
            AnswerCertainty = Math.Clamp(TryGetDouble(s, "answer_certainty") ?? 0.5, 0.0, 1.0),
            CreatedAt = now,
        };
    }

    private (List<Mention> Mentions, List<MentionCandidate> Candidates, List<MentionAttribute> Attributes, List<FactualClaim> Claims, List<MentionRiskFlag> RiskFlags, List<MentionComparison> Comparisons, List<MentionRecommendationContext> RecommendationContexts) BuildMentions(
        JsonElement root, Guid aiAnswerId, string answerText, SignalExtractionContext context)
    {
        var mentions = new List<Mention>();
        var candidates = new List<MentionCandidate>();
        var attributes = new List<MentionAttribute>();
        var claims = new List<FactualClaim>();
        var riskFlags = new List<MentionRiskFlag>();
        var comparisons = new List<MentionComparison>();
        var recommendationContexts = new List<MentionRecommendationContext>();
        if (!root.TryGetProperty("mentions", out var arr) || arr.ValueKind != JsonValueKind.Array)
        {
            return (mentions, candidates, attributes, claims, riskFlags, comparisons, recommendationContexts);
        }

        var now = DateTime.UtcNow;
        foreach (var m in arr.EnumerateArray())
        {
            var entityType = ParseEnum<MentionEntityType>(m, "entity_type", MentionEntityType.Competitor);
            var name = TryGetNullableString(m, "name") ?? string.Empty;
            var normalized = Normalize(name);
            if (string.IsNullOrEmpty(normalized))
            {
                continue;
            }

            var resolved = ResolveEntity(entityType, normalized, context);
            var evidence = Truncate(TryGetNullableString(m, "evidence_snippet") ?? string.Empty, 2000);

            if (resolved is not null)
            {
                var (mentionCount, firstPosition) = ComputeProminence(
                    entityType, resolved.Value, normalized, answerText, context);
                var sentiment = ParseEnum<Sentiment>(m, "sentiment", Sentiment.Unknown);
                var sentimentScore = ReadSentimentScore(m, "sentiment_score", sentiment);
                var recommendationStrength = ParseEnum<RecommendationStrength>(
                    m, "recommendation_strength", RecommendationStrength.Unknown);
                var recommendationScore = ReadRecommendationScore(
                    m, "recommendation_score", recommendationStrength);
                var mention = new Mention
                {
                    Id = Guid.NewGuid(),
                    AIAnswerId = aiAnswerId,
                    EntityType = entityType,
                    EntityId = resolved.Value,
                    NormalizedName = normalized,
                    IsRecommended = TryGetBoolean(m, "is_recommended") ?? false,
                    RecommendationStrength = recommendationStrength,
                    RecommendationScore = recommendationScore,
                    Sentiment = sentiment,
                    SentimentScore = sentimentScore,
                    ConfidenceScore = TryGetDouble(m, "confidence_score") ?? 0.5,
                    EvidenceSnippet = evidence,
                    MentionCount = mentionCount,
                    FirstMentionPosition = firstPosition,
                    CreatedAt = now,
                };
                mentions.Add(mention);
                attributes.AddRange(BuildAttributes(m, mention.Id, now));
                claims.AddRange(BuildFactualClaims(m, mention.Id, now));
                riskFlags.AddRange(BuildRiskFlags(m, mention.Id, now));
                comparisons.AddRange(BuildComparisons(m, mention.Id, normalized, now));
                recommendationContexts.AddRange(BuildRecommendationContexts(m, mention.Id, now));
            }
            else if (entityType is MentionEntityType.Competitor or MentionEntityType.Product)
            {
                // Untracked LLM-named entity per D19 — preserve as candidate for the
                // future "promote to tracked" screen. Brand mentions that don't resolve
                // are dropped: the LLM should only emit Brand for the tracked brand.
                candidates.Add(new MentionCandidate
                {
                    Id = Guid.NewGuid(),
                    AIAnswerId = aiAnswerId,
                    ClaimedEntityType = entityType,
                    ClaimedName = Truncate(name, 500),
                    NormalizedName = normalized,
                    EvidenceSnippet = evidence,
                    ConfidenceScore = TryGetDouble(m, "confidence_score") ?? 0.5,
                    CreatedAt = now,
                });
            }
        }
        return (mentions, candidates, attributes, claims, riskFlags, comparisons, recommendationContexts);
    }

    private static IEnumerable<DraftCitation> BuildDraftCitations(
        JsonElement root, Guid aiAnswerId, SignalExtractionContext context)
    {
        if (!root.TryGetProperty("citations", out var arr) || arr.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        var brandDomain = NormalizeDomain(context.Brand.WebsiteUrl);
        var competitorDomains = context.TrackedCompetitors
            .Select(c => NormalizeDomain(c.Domain))
            .Where(d => !string.IsNullOrEmpty(d))
            .Select(d => d!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var c in arr.EnumerateArray())
        {
            var sourceName = TryGetNullableString(c, "source_name");
            if (string.IsNullOrWhiteSpace(sourceName))
            {
                continue;
            }
            var url = TryGetNullableString(c, "url");
            var hasUrl = !string.IsNullOrWhiteSpace(url);
            var normalizedDomain = hasUrl ? NormalizeDomain(url) : null;
            var normalizedUrl = hasUrl ? NormalizeUrl(url!) : null;

            var classified = ClassifyCitation(normalizedDomain, brandDomain, competitorDomains);

            yield return new DraftCitation(
                AIAnswerId: aiAnswerId,
                SourceName: Truncate(sourceName, 500),
                NormalizedSourceName: Normalize(sourceName),
                Url: hasUrl ? Truncate(url!, 2048) : null,
                NormalizedDomain: normalizedDomain,
                NormalizedUrl: normalizedUrl,
                CitationType: hasUrl ? CitationType.ExplicitUrl : CitationType.MentionedSource,
                ClassifiedAs: classified,
                ConfidenceScore: TryGetDouble(c, "confidence_score") ?? 0.5);
        }
    }

    /// <summary>
    /// v1 URL-domain classifier. Returns Owned / Competitor / Unknown only —
    /// more specific values (Corporate, UGC, Editorial, ReviewSite, etc.)
    /// need LLM-based or KnownDomainList classification that isn't in v1.
    /// "URL present but no match" → Unknown (honest "we don't know" rather
    /// than a fake-ThirdParty label).
    /// </summary>
    private static SourceType ClassifyCitation(
        string? domain, string? brandDomain, HashSet<string> competitorDomains)
    {
        if (string.IsNullOrEmpty(domain)) return SourceType.Unknown;
        if (!string.IsNullOrEmpty(brandDomain) && DomainMatches(domain, brandDomain))
            return SourceType.Owned;
        if (competitorDomains.Any(cd => DomainMatches(domain, cd)))
            return SourceType.Competitor;
        return SourceType.Unknown;
    }

    /// <summary>
    /// Canonical full-URL form for <see cref="SourceUrl"/> dedup: lowercase
    /// host, strip "www.", keep path + query, drop trailing slash.
    /// </summary>
    private static string NormalizeUrl(string url)
    {
        var s = url.Trim();
        if (!s.Contains("://", StringComparison.Ordinal)) s = "https://" + s;
        if (!Uri.TryCreate(s, UriKind.Absolute, out var uri)) return url.ToLowerInvariant();
        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal)) host = host[4..];
        return $"{uri.Scheme}://{host}{uri.AbsolutePath}{uri.Query}".TrimEnd('/');
    }

    private static bool DomainMatches(string a, string b)
    {
        // Exact or subdomain match: "blog.acme.com" matches "acme.com", but
        // "fake-acme.com" does NOT match "acme.com".
        if (string.Equals(a, b, StringComparison.OrdinalIgnoreCase)) return true;
        return a.EndsWith("." + b, StringComparison.OrdinalIgnoreCase);
    }

    private static Guid? ResolveEntity(
        MentionEntityType entityType, string normalizedName, SignalExtractionContext context)
    {
        return entityType switch
        {
            MentionEntityType.Brand => ResolveBrand(normalizedName, context.Brand),
            MentionEntityType.Competitor => context.TrackedCompetitors
                .FirstOrDefault(c => Normalize(c.Name) == normalizedName)?.Id,
            MentionEntityType.Product => context.TrackedProducts
                .FirstOrDefault(p => Normalize(p.Name) == normalizedName)?.Id,
            _ => null,
        };
    }

    private static Guid? ResolveBrand(string normalizedName, Brand brand)
    {
        if (Normalize(brand.Name) == normalizedName) return brand.Id;
        return brand.Aliases.Any(a => Normalize(a) == normalizedName) ? brand.Id : null;
    }

    /// <summary>
    /// Deterministic prominence: count case-insensitive occurrences of the
    /// entity's canonical name in the answer text, and the normalized
    /// position (0..1) of the first occurrence. Falls back to the LLM's
    /// reported name when the canonical name isn't found, and finally to
    /// `(1, 0.5)` when nothing matches — the Mention exists because the
    /// LLM extracted it, so 0 is never the right answer for `MentionCount`.
    /// </summary>
    private static (int Count, double Position) ComputeProminence(
        MentionEntityType entityType, Guid entityId, string normalizedFromLlm,
        string answerText, SignalExtractionContext context)
    {
        if (string.IsNullOrEmpty(answerText))
        {
            return (1, 0.5);
        }

        var canonicalName = ResolveCanonicalName(entityType, entityId, context);
        var (count, firstOffset) = FindOccurrences(answerText, canonicalName);
        if (count == 0)
        {
            // LLM paraphrased — search for whatever name the LLM reported.
            (count, firstOffset) = FindOccurrences(answerText, normalizedFromLlm);
        }
        if (count == 0)
        {
            return (1, 0.5);
        }

        var position = (double)firstOffset / Math.Max(answerText.Length, 1);
        return (count, Math.Clamp(position, 0.0, 1.0));
    }

    /// <summary>
    /// Pulls the canonical (display) name from the extraction context for a
    /// resolved entity. Used as the primary search term for prominence
    /// computation — more reliable than the LLM's paraphrase.
    /// </summary>
    private static string ResolveCanonicalName(
        MentionEntityType entityType, Guid entityId, SignalExtractionContext context)
    {
        return entityType switch
        {
            MentionEntityType.Brand =>
                context.Brand.Id == entityId ? context.Brand.Name : string.Empty,
            MentionEntityType.Competitor =>
                context.TrackedCompetitors.FirstOrDefault(c => c.Id == entityId)?.Name ?? string.Empty,
            MentionEntityType.Product =>
                context.TrackedProducts.FirstOrDefault(p => p.Id == entityId)?.Name ?? string.Empty,
            _ => string.Empty,
        };
    }

    /// <summary>
    /// Counts non-overlapping case-insensitive occurrences of `needle` in
    /// `text` and returns the offset of the first one. Returns `(0, -1)`
    /// when `needle` is empty or doesn't appear.
    /// </summary>
    private static (int Count, int FirstOffset) FindOccurrences(string text, string needle)
    {
        if (string.IsNullOrEmpty(needle) || string.IsNullOrEmpty(text))
        {
            return (0, -1);
        }
        var count = 0;
        var firstOffset = -1;
        var idx = 0;
        while ((idx = text.IndexOf(needle, idx, StringComparison.OrdinalIgnoreCase)) >= 0)
        {
            count++;
            if (firstOffset < 0) firstOffset = idx;
            idx += needle.Length;
        }
        return (count, firstOffset);
    }

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var collapsed = string.Join(' ',
            value.ToLowerInvariant().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        return collapsed.Trim();
    }

    private static string? NormalizeDomain(string? urlOrDomain)
    {
        if (string.IsNullOrWhiteSpace(urlOrDomain)) return null;
        var s = urlOrDomain.Trim();
        if (!s.Contains("://", StringComparison.Ordinal))
        {
            s = "https://" + s;
        }
        if (!Uri.TryCreate(s, UriKind.Absolute, out var uri) || string.IsNullOrEmpty(uri.Host))
        {
            return null;
        }
        var host = uri.Host.ToLowerInvariant();
        return host.StartsWith("www.", StringComparison.Ordinal) ? host[4..] : host;
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];

    private static int? TryGetNullableInt(JsonElement parent, string name) =>
        parent.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number
            ? v.GetInt32() : null;

    private static double? TryGetDouble(JsonElement parent, string name) =>
        parent.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number
            ? v.GetDouble() : null;

    /// <summary>
    /// Reads the factual_claims array from a mention's JSON element and
    /// turns each row into a draft <see cref="FactualClaim"/>. Required
    /// fields (claim_text, subject, asserted_value) drop the row when
    /// any is missing — keeps the review inbox clean of half-extracted
    /// noise. Subject is normalized (lowercased + collapsed whitespace);
    /// claim_text + asserted_value are truncated to their column limits.
    /// </summary>
    /// <summary>
    /// Reads the ordered <c>recommended_entities</c> array from the answer
    /// signal and turns each entry into an <see cref="AnswerRecommendation"/>
    /// row. Position is 1-based by order of appearance, after dropping empty/
    /// whitespace entries. Cap at 20 entries to match the prompt cap. Missing
    /// array → empty list (no recommendations is meaningful — distinct from
    /// "the LLM forgot to emit the field").
    /// </summary>
    private static List<AnswerRecommendation> BuildAnswerRecommendations(
        JsonElement root, Guid aiAnswerId)
    {
        var rows = new List<AnswerRecommendation>();
        if (!root.TryGetProperty("answer_signal", out var signal)
            || !signal.TryGetProperty("recommended_entities", out var arr)
            || arr.ValueKind != JsonValueKind.Array)
        {
            return rows;
        }
        var now = DateTime.UtcNow;
        var position = 1;
        const int Cap = 20;
        foreach (var entry in arr.EnumerateArray())
        {
            if (entry.ValueKind != JsonValueKind.String) continue;
            var name = entry.GetString();
            if (string.IsNullOrWhiteSpace(name)) continue;
            rows.Add(new AnswerRecommendation
            {
                Id = Guid.NewGuid(),
                AIAnswerId = aiAnswerId,
                ClaimedName = Truncate(name.Trim(), 500),
                NormalizedName = Normalize(name),
                Position = position++,
                CreatedAt = now,
            });
            if (rows.Count >= Cap) break;
        }
        return rows;
    }

    /// <summary>
    /// Reads the risk_flags array from a mention's JSON element and turns
    /// each row into a draft <see cref="MentionRiskFlag"/>. Flag types are
    /// normalised to lowercase snake_case for cross-answer grouping. Rows
    /// missing flag_type are skipped. Missing array → empty list.
    /// </summary>
    private static IEnumerable<MentionRiskFlag> BuildRiskFlags(
        JsonElement mention, Guid mentionId, DateTime now)
    {
        if (!mention.TryGetProperty("risk_flags", out var arr)
            || arr.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }
        foreach (var r in arr.EnumerateArray())
        {
            var flagType = TryGetNullableString(r, "flag_type");
            if (string.IsNullOrWhiteSpace(flagType)) continue;
            yield return new MentionRiskFlag
            {
                Id = Guid.NewGuid(),
                MentionId = mentionId,
                FlagType = Truncate(NormalizeFlagType(flagType), 100),
                Severity = ParseEnum<RiskSeverity>(r, "severity", RiskSeverity.Low),
                EvidenceSnippet = Truncate(
                    TryGetNullableString(r, "evidence_snippet") ?? string.Empty, 500),
                CreatedAt = now,
            };
        }
    }

    /// <summary>
    /// Reads recommended_for and with_caveats arrays from a mention's JSON
    /// element and turns each non-empty entry into a draft
    /// <see cref="MentionRecommendationContext"/>. Values lowercased +
    /// whitespace-collapsed for grouping. Empty / whitespace entries dropped.
    /// </summary>
    private static IEnumerable<MentionRecommendationContext> BuildRecommendationContexts(
        JsonElement mention, Guid mentionId, DateTime now)
    {
        foreach (var row in ReadContextArray(mention, "recommended_for", RecommendationContextType.RecommendedFor, mentionId, now))
            yield return row;
        foreach (var row in ReadContextArray(mention, "with_caveats", RecommendationContextType.WithCaveats, mentionId, now))
            yield return row;
    }

    private static IEnumerable<MentionRecommendationContext> ReadContextArray(
        JsonElement mention, string property, RecommendationContextType type, Guid mentionId, DateTime now)
    {
        if (!mention.TryGetProperty(property, out var arr)
            || arr.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }
        foreach (var entry in arr.EnumerateArray())
        {
            if (entry.ValueKind != JsonValueKind.String) continue;
            var raw = entry.GetString();
            if (string.IsNullOrWhiteSpace(raw)) continue;
            yield return new MentionRecommendationContext
            {
                Id = Guid.NewGuid(),
                MentionId = mentionId,
                ContextType = type,
                ContextValue = Truncate(Normalize(raw), 300),
                CreatedAt = now,
            };
        }
    }

    /// <summary>
    /// Reads the comparisons array from a mention's JSON element and turns
    /// each row into a draft <see cref="MentionComparison"/>. Drops rows
    /// with missing vs_entity, missing on_aspect, or self-comparisons
    /// (vs_entity normalizes to the same key as this mention).
    /// </summary>
    private static IEnumerable<MentionComparison> BuildComparisons(
        JsonElement mention, Guid mentionId, string thisMentionNormalized, DateTime now)
    {
        if (!mention.TryGetProperty("comparisons", out var arr)
            || arr.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }
        foreach (var c in arr.EnumerateArray())
        {
            var vs = TryGetNullableString(c, "vs_entity");
            var aspect = TryGetNullableString(c, "on_aspect");
            if (string.IsNullOrWhiteSpace(vs) || string.IsNullOrWhiteSpace(aspect)) continue;
            var vsNormalized = Normalize(vs);
            if (string.IsNullOrEmpty(vsNormalized)) continue;
            // Skip self-comparisons — the rules block in the prompt asks the
            // LLM to skip these but a stale model could still emit them.
            if (vsNormalized.Equals(thisMentionNormalized, StringComparison.OrdinalIgnoreCase)) continue;

            var winner = TryGetNullableString(c, "winner")?.Trim().ToLowerInvariant();
            if (winner != "this" && winner != "other") continue;

            yield return new MentionComparison
            {
                Id = Guid.NewGuid(),
                MentionId = mentionId,
                VsEntityName = Truncate(vs.Trim(), 500),
                VsEntityNormalized = vsNormalized,
                OnAspect = Truncate(NormalizeFlagType(aspect), 100),
                WinnerIsThisMention = winner == "this",
                EvidenceSnippet = string.Empty,
                CreatedAt = now,
            };
        }
    }

    private static string NormalizeFlagType(string value) =>
        System.Text.RegularExpressions.Regex.Replace(value.Trim().ToLowerInvariant(), @"\s+", "_");

    private static IEnumerable<FactualClaim> BuildFactualClaims(
        JsonElement mention, Guid mentionId, DateTime now)
    {
        if (!mention.TryGetProperty("factual_claims", out var arr)
            || arr.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }
        foreach (var c in arr.EnumerateArray())
        {
            var claimText = TryGetNullableString(c, "claim_text");
            var subject = Normalize(TryGetNullableString(c, "subject"));
            var assertedValue = TryGetNullableString(c, "asserted_value");
            if (string.IsNullOrWhiteSpace(claimText)
                || string.IsNullOrEmpty(subject)
                || string.IsNullOrWhiteSpace(assertedValue))
            {
                continue;
            }
            yield return new FactualClaim
            {
                Id = Guid.NewGuid(),
                MentionId = mentionId,
                ClaimText = Truncate(claimText, 1000),
                Subject = Truncate(subject, 100),
                AssertedValue = Truncate(assertedValue, 500),
                EvidenceSnippet = Truncate(
                    TryGetNullableString(c, "evidence_snippet") ?? string.Empty, 500),
                Verifiability = ParseEnum<ClaimVerifiability>(
                    c, "verifiability", ClaimVerifiability.Verifiable),
                ReviewStatus = ClaimReviewStatus.Pending,
                ConfidenceScore = TryGetDouble(c, "confidence_score") ?? 0.5,
                CreatedAt = now,
            };
        }
    }

    /// <summary>
    /// Reads the attributes array from a mention's JSON element and turns
    /// each row into a draft <see cref="MentionAttribute"/>. Names are
    /// normalized (lowercased, whitespace collapsed, trimmed). Rows with
    /// empty names are skipped. Missing array → empty list.
    /// </summary>
    private static IEnumerable<MentionAttribute> BuildAttributes(
        JsonElement mention, Guid mentionId, DateTime now)
    {
        if (!mention.TryGetProperty("attributes", out var arr)
            || arr.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }
        foreach (var a in arr.EnumerateArray())
        {
            var rawName = TryGetNullableString(a, "name");
            var name = Normalize(rawName);
            if (string.IsNullOrEmpty(name)) continue;
            var truncatedName = Truncate(name, 200);
            yield return new MentionAttribute
            {
                Id = Guid.NewGuid(),
                MentionId = mentionId,
                Name = truncatedName,
                Polarity = ParseEnum<AttributePolarity>(a, "polarity", AttributePolarity.Neutral),
                EvidenceSnippet = Truncate(
                    TryGetNullableString(a, "evidence_snippet") ?? string.Empty, 500),
                ConfidenceScore = TryGetDouble(a, "confidence_score") ?? 0.5,
                CreatedAt = now,
            };
        }
    }

    /// <summary>
    /// Reads the numeric recommendation_score (or brand_recommendation_score)
    /// from the LLM's JSON output, clamped to [-1.0, +1.0]. When the LLM
    /// omits the field, derives a score from the strength enum so callers
    /// always get a usable number — Strong→+0.9, Moderate→+0.5, Weak→+0.2,
    /// NotRecommended→-0.7, Unknown→0.0. Measurement-model expansion item
    /// #5: numeric recommendation strength alongside the legacy enum.
    /// </summary>
    private static double ReadRecommendationScore(
        JsonElement parent, string name, RecommendationStrength fallbackEnum)
    {
        var raw = TryGetDouble(parent, name);
        if (raw is not null)
        {
            return Math.Clamp(raw.Value, -1.0, 1.0);
        }
        return fallbackEnum switch
        {
            RecommendationStrength.Strong => 0.9,
            RecommendationStrength.Moderate => 0.5,
            RecommendationStrength.Weak => 0.2,
            RecommendationStrength.NotRecommended => -0.7,
            _ => 0.0,
        };
    }

    /// <summary>
    /// Reads the numeric sentiment_score (or brand_sentiment_score) from the
    /// LLM's JSON output, clamped to [-1.0, +1.0]. When the LLM omits the
    /// field, derives a score from the enum so callers always get a usable
    /// number — Positive→+0.75, Negative→-0.75, others→0.0. Slice-2 of the
    /// measurement-model expansion: numeric sentiment alongside the legacy
    /// enum.
    /// </summary>
    private static double ReadSentimentScore(JsonElement parent, string name, Sentiment fallbackEnum)
    {
        var raw = TryGetDouble(parent, name);
        if (raw is not null)
        {
            return Math.Clamp(raw.Value, -1.0, 1.0);
        }
        return fallbackEnum switch
        {
            Sentiment.Positive => 0.75,
            Sentiment.Negative => -0.75,
            _ => 0.0,
        };
    }

    private static bool? TryGetBoolean(JsonElement parent, string name) =>
        parent.TryGetProperty(name, out var v) && (v.ValueKind == JsonValueKind.True || v.ValueKind == JsonValueKind.False)
            ? v.GetBoolean() : null;

    private static string? TryGetNullableString(JsonElement parent, string name) =>
        parent.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString() : null;

    private static T ParseEnum<T>(JsonElement parent, string name, T fallback) where T : struct, Enum
    {
        var s = TryGetNullableString(parent, name);
        return !string.IsNullOrEmpty(s) && Enum.TryParse<T>(s, ignoreCase: true, out var v) ? v : fallback;
    }
}
