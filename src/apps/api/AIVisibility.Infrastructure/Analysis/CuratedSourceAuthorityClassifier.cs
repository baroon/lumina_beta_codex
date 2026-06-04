using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Static-allowlist authority classifier (Phase 4 measurement-model
/// expansion, item 16). Hand-curated mapping of well-known publication
/// + reference domains to authority scores on a 0-100 scale. Domains
/// not on the list return null — the caller treats null as "no opinion"
/// and leaves Source.AuthorityScore null.
///
/// Tier rationale:
///   90-100: gold-standard reference / wire / major newsroom
///   70-89:  established national publication
///   40-69:  tier-2 industry publication / trade press
///   10-39:  user-generated content sites (treated as low-signal)
///
/// The list is intentionally small — a future iteration may swap to an
/// external API. Sub-/super-domain matching: if "blog.example.com" is not
/// listed but "example.com" is, the parent score is used (so vendor blogs
/// inherit from their root domain).
/// </summary>
public class CuratedSourceAuthorityClassifier : ISourceAuthorityClassifier
{
    private static readonly IReadOnlyDictionary<string, double> Scores =
        new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase)
        {
            // Tier 1 — gold standard (90-100)
            ["nytimes.com"] = 95,
            ["wsj.com"] = 95,
            ["ft.com"] = 95,
            ["reuters.com"] = 95,
            ["apnews.com"] = 95,
            ["bbc.com"] = 92,
            ["bbc.co.uk"] = 92,
            ["bloomberg.com"] = 92,
            ["economist.com"] = 92,
            ["wikipedia.org"] = 90,
            ["nature.com"] = 95,
            ["science.org"] = 95,
            // Tier 2 — established national (70-89)
            ["washingtonpost.com"] = 85,
            ["theguardian.com"] = 85,
            ["nbcnews.com"] = 80,
            ["cnn.com"] = 80,
            ["forbes.com"] = 75,
            ["cnbc.com"] = 75,
            // Tech / industry trade (40-69)
            ["techcrunch.com"] = 65,
            ["theverge.com"] = 65,
            ["wired.com"] = 65,
            ["arstechnica.com"] = 65,
            ["engadget.com"] = 55,
            ["zdnet.com"] = 55,
            ["venturebeat.com"] = 50,
            // User-generated / aggregator (10-39)
            ["reddit.com"] = 25,
            ["quora.com"] = 20,
            ["medium.com"] = 30,
        };

    public double? Score(string? normalizedDomain)
    {
        if (string.IsNullOrEmpty(normalizedDomain)) return null;
        if (Scores.TryGetValue(normalizedDomain, out var exact)) return exact;

        // Sub-domain fallback: walk up label by label so "blog.example.com" picks
        // up "example.com" when present. Stops at the public suffix boundary —
        // a domain string of "co.uk" without prefix is invalid input but the
        // dictionary just returns null which is the correct outcome.
        var labels = normalizedDomain.Split('.');
        for (var i = 1; i < labels.Length - 1; i++)
        {
            var candidate = string.Join('.', labels.Skip(i));
            if (Scores.TryGetValue(candidate, out var parent)) return parent;
        }
        return null;
    }
}
