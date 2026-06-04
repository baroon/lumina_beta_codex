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
            "brand_sentiment": "Positive|Neutral|Negative|Mixed|Unknown",
            "brand_sentiment_score": number, // -1.0..+1.0; finer-grained than the enum. See sentiment-score rules below.
            "brand_recommendation_strength": "Strong|Moderate|Weak|NotRecommended|Unknown",
            "top_recommended_entity": string|null,
            "answer_has_ranking": bool,
            "answer_has_comparison": bool,
            "answer_has_citations": bool,
            "confidence_score": number       // 0.0-1.0
          },
          "mentions": [
            {
              "entity_type": "Brand|Competitor|Product",
              "name": string,                // exact mention text from the answer
              "is_recommended": bool,
              "recommendation_strength": "Strong|Moderate|Weak|NotRecommended|Unknown",
              "sentiment": "Positive|Neutral|Negative|Mixed|Unknown",
              "sentiment_score": number,     // -1.0..+1.0; finer-grained than the enum. See sentiment-score rules below.
              "evidence_snippet": string,    // ≤500 chars; quoted sentence(s) from the answer
              "confidence_score": number     // 0.0-1.0
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
            brand_sentiment = "Unknown"
            brand_sentiment_score = 0
            brand_recommendation_strength = "Unknown"
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
            var (mentions, candidates) = BuildMentions(root, answer.Id, answer.AnswerText, context);
            var signal = BuildSignal(root, answer.Id, drafts);
            return new SignalExtractionResult(signal, mentions, candidates, drafts);
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
        var brandRank = brandMentioned ? TryGetNullableInt(s, "brand_rank") : null;
        var brandRecommended = brandMentioned && (TryGetBoolean(s, "brand_recommended") ?? false);

        return new AnswerSignal
        {
            Id = Guid.NewGuid(),
            AIAnswerId = aiAnswerId,
            BrandMentioned = brandMentioned,
            BrandRecommended = brandRecommended,
            BrandRank = brandRank,
            BrandSentiment = brandSentiment,
            BrandSentimentScore = brandSentimentScore,
            BrandRecommendationStrength = brandStrength,
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
            CreatedAt = now,
        };
    }

    private (List<Mention> Mentions, List<MentionCandidate> Candidates) BuildMentions(
        JsonElement root, Guid aiAnswerId, string answerText, SignalExtractionContext context)
    {
        var mentions = new List<Mention>();
        var candidates = new List<MentionCandidate>();
        if (!root.TryGetProperty("mentions", out var arr) || arr.ValueKind != JsonValueKind.Array)
        {
            return (mentions, candidates);
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
                mentions.Add(new Mention
                {
                    Id = Guid.NewGuid(),
                    AIAnswerId = aiAnswerId,
                    EntityType = entityType,
                    EntityId = resolved.Value,
                    NormalizedName = normalized,
                    IsRecommended = TryGetBoolean(m, "is_recommended") ?? false,
                    RecommendationStrength = ParseEnum<RecommendationStrength>(
                        m, "recommendation_strength", RecommendationStrength.Unknown),
                    Sentiment = sentiment,
                    SentimentScore = sentimentScore,
                    ConfidenceScore = TryGetDouble(m, "confidence_score") ?? 0.5,
                    EvidenceSnippet = evidence,
                    MentionCount = mentionCount,
                    FirstMentionPosition = firstPosition,
                    CreatedAt = now,
                });
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
        return (mentions, candidates);
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
