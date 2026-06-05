using System.Text;
using System.Text.Json;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// LLM-backed implementation of <see cref="ISourceClassifier"/>. Sends a
/// compact prompt with the source's name + domain + sample URL and asks for
/// one of the 12 <see cref="SourceType"/> codes back. Phase 4 v1 plan §Block 1
/// (D2/D3/D4).
///
/// Same model as the extractor (D2 — single config knob). Returns null on
/// empty/invalid LLM response so the calling job can leave the
/// <c>BrandSourceClassification</c> row at its rule-based verdict (D4).
/// </summary>
public class LlmSourceClassifier : ISourceClassifier
{
    private readonly IOpenAiService _openAi;
    private readonly ILogger<LlmSourceClassifier> _logger;

    public LlmSourceClassifier(IOpenAiService openAi, ILogger<LlmSourceClassifier> logger)
    {
        _openAi = openAi;
        _logger = logger;
    }

    // System prompt: ADR-003's 12-value taxonomy definitions inline so the
    // LLM sees the same wording as the source_types reference table. Keeping
    // the prompt and the reference table aligned by hand because the prompt
    // is the load-bearing thing — DB-driven prompts add a dependency without
    // saving meaningful work (12 short defs).
    private const string SystemPrompt = """
        You classify web sources cited by AI assistants into ONE of these 12 types.
        Return ONLY a JSON object — no prose, no markdown fences — matching:

        {
          "source_type": "<one of the 12 codes below>",
          "confidence_score": <number 0.0-1.0>,
          "rationale": "<one sentence>"
        }

        The 12 codes and what each means:

        - Owned: the brand's own properties (website, blog, owned domains). DO NOT pick this — the upstream URL matcher handles Owned; you only see sources it could not match.
        - Competitor: a tracked competitor's own properties. DO NOT pick this — same reason as Owned.
        - Corporate: a non-competitor corporate site (partner, supplier, vendor, parent company, B2B vendor site that isn't a tracked competitor).
        - UGC: user-generated content — Reddit, forums, Quora, community discussions, comment threads.
        - Editorial: news articles, magazine pieces, journalistic coverage, professional blogs run as a publication.
        - ReviewSite: dedicated review aggregators — G2, Trustpilot, Capterra, Yelp, TripAdvisor.
        - Social: social-media platform posts — Twitter/X, LinkedIn, Instagram, TikTok, YouTube.
        - Institutional: government, NGO, academic, or industry-body publications (.gov, .edu, professional associations).
        - Reference: reference works — Wikipedia, encyclopedias, dictionaries, knowledge bases.
        - Marketplace: e-commerce listings — Amazon, eBay, App Store product pages, marketplace product pages.
        - Other: a real source that does not fit any of the above categories. Use sparingly.
        - Unknown: the source name and domain don't give enough signal to classify at all (gibberish, ambiguous one-word name without context).

        Rules:
        - Prefer the most specific applicable code. A Reddit thread is UGC, not Other.
        - Confidence reflects how clearly the source matches one bucket; ~0.9 when domain is well-known, ~0.5 when only the name is suggestive, ~0.3 when guessing.
        - One sentence in rationale — what specifically tipped the decision.
        - When the domain alone is decisive (wikipedia.org, reddit.com, g2.com), do not over-think; high confidence.
        """;

    public async Task<SourceClassificationVerdict?> ClassifyAsync(
        SourceClassificationRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.SourceName))
        {
            return null;
        }

        var userPrompt = BuildUserPrompt(request);

        var raw = (await _openAi.ChatCompletionAsync(
            SystemPrompt,
            userPrompt,
            maxTokens: 256,
            temperature: 0.1,
            ct: cancellationToken)).Text;

        if (string.IsNullOrWhiteSpace(raw))
        {
            _logger.LogWarning(
                "Source classifier returned empty response for {SourceName} ({Domain})",
                request.SourceName, request.NormalizedDomain);
            return null;
        }

        try
        {
            return Parse(raw);
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException)
        {
            _logger.LogWarning(ex,
                "Source classifier JSON parse failed for {SourceName} ({Domain}). Response prefix: {Prefix}",
                request.SourceName, request.NormalizedDomain, Truncate(raw, 200));
            return null;
        }
    }

    private static string BuildUserPrompt(SourceClassificationRequest request)
    {
        var sb = new StringBuilder();
        sb.Append("Source name: ").AppendLine(request.SourceName);
        if (!string.IsNullOrWhiteSpace(request.NormalizedDomain))
        {
            sb.Append("Domain: ").AppendLine(request.NormalizedDomain);
        }
        if (!string.IsNullOrWhiteSpace(request.SampleUrl))
        {
            sb.Append("Sample URL: ").AppendLine(request.SampleUrl);
        }
        return sb.ToString();
    }

    private static SourceClassificationVerdict Parse(string raw)
    {
        // Tolerate markdown fences + leading prose by trimming to the outer JSON object.
        var start = raw.IndexOf('{');
        var end = raw.LastIndexOf('}');
        if (start < 0 || end <= start)
        {
            throw new JsonException("No JSON object found in classifier response.");
        }
        using var doc = JsonDocument.Parse(raw.AsSpan(start, end - start + 1).ToString());
        var root = doc.RootElement;

        var typeStr = root.GetProperty("source_type").GetString()
            ?? throw new JsonException("source_type missing or null.");
        if (!Enum.TryParse<SourceType>(typeStr, ignoreCase: true, out var type))
        {
            throw new JsonException($"source_type '{typeStr}' is not a valid SourceType.");
        }

        var confidence = root.TryGetProperty("confidence_score", out var c) && c.ValueKind == JsonValueKind.Number
            ? c.GetDouble()
            : 0.5;
        var rationale = root.TryGetProperty("rationale", out var r) && r.ValueKind == JsonValueKind.String
            ? r.GetString()
            : null;

        return new SourceClassificationVerdict(type, confidence, rationale);
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
