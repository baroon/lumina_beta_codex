namespace AIVisibility.Application;

/// <summary>
/// Compile-time-ish-safe names for the metric_name column on ScanMetric
/// (Phase 3 plan §3, D15). Slice (c) MVP set; ADR-003's remaining names
/// (SentimentDistribution, TopCitedSources, ShareOfVoice) land later once
/// the reporting UI pins down the metadata_json shape they need.
/// </summary>
public static class MetricNames
{
    // -- Brand-level rates and averages (Overall / Platform / Lens / Topic scopes) --

    /// <summary>Fraction of AnswerSignals where the brand was mentioned. 0.0-1.0.</summary>
    public const string BrandMentionRate = "BrandMentionRate";

    /// <summary>Fraction of AnswerSignals where the brand was recommended. 0.0-1.0.</summary>
    public const string BrandRecommendationRate = "BrandRecommendationRate";

    /// <summary>
    /// Average <c>brand_rank</c> across signals where brand_rank is non-null
    /// (i.e. answers that included a ranked list with the brand in it). Only
    /// emitted when at least one signal contributed; absent otherwise.
    /// </summary>
    public const string AverageBrandRank = "AverageBrandRank";

    // -- Mention counts (Overall / Platform / Lens / Topic scopes) --

    /// <summary>Total Mention rows where entity_type = Competitor.</summary>
    public const string CompetitorMentionCount = "CompetitorMentionCount";

    /// <summary>Total Mention rows where entity_type = Product.</summary>
    public const string ProductMentionCount = "ProductMentionCount";

    // -- Per-competitor metrics (Competitor scope only — scope_id = competitor.id) --

    /// <summary>Mentions targeting this tracked competitor.</summary>
    public const string MentionCount = "MentionCount";

    /// <summary>Mentions targeting this tracked competitor with is_recommended=true.</summary>
    public const string RecommendationCount = "RecommendationCount";

    // -- Citation counts (Overall / Platform / Lens / Topic scopes) --

    /// <summary>Total Citation rows.</summary>
    public const string CitationCount = "CitationCount";

    /// <summary>Citations classified Owned.</summary>
    public const string OwnedCitationCount = "OwnedCitationCount";

    /// <summary>Citations classified Competitor.</summary>
    public const string CompetitorCitationCount = "CompetitorCitationCount";

    /// <summary>Citations classified ThirdParty.</summary>
    public const string ThirdPartyCitationCount = "ThirdPartyCitationCount";
}
