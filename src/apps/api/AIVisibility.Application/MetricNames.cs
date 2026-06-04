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

    /// <summary>
    /// Sum of <c>Mention.MentionCount</c> for the tracked Brand across the
    /// scope's mentions. Distinct from <see cref="BrandMentionRate"/> which
    /// is binary "did the brand appear in this answer?"; this metric
    /// captures "how many times in total." Always emitted (zero when the
    /// brand wasn't mentioned in scope).
    /// </summary>
    public const string BrandMentionCount = "BrandMentionCount";

    /// <summary>
    /// Mean of <c>Mention.FirstMentionPosition</c> across the scope's brand
    /// mentions. 0.0 = appears at the very start of every answer, 1.0 =
    /// appears at the very end. Lower is more prominent. Omitted (no row
    /// emitted) when the brand has no mentions in scope — same
    /// denominator-zero pattern as <see cref="BrandShareOfVoice"/>.
    /// </summary>
    public const string BrandFirstMentionPosition = "BrandFirstMentionPosition";

    /// <summary>
    /// Mean of <c>AnswerSignal.BrandSentimentScore</c> across signals where
    /// the brand was mentioned. Range [-1.0, +1.0] — finer-grained
    /// companion to <see cref="BrandSentimentDistribution"/>. Omitted (no
    /// row emitted) when no signals in scope had the brand mentioned —
    /// same denominator-zero pattern as <see cref="BrandShareOfVoice"/>;
    /// reporting consumers should treat absent-metric as "no data."
    /// </summary>
    public const string BrandSentimentScore = "BrandSentimentScore";

    /// <summary>
    /// Fraction of answers (with ≥1 mention) where the brand was the
    /// first-named entity by <c>Mention.FirstMentionPosition</c>. Strong
    /// order-of-mention preference signal independent of explicit
    /// ranking — "Apple, Google, Microsoft are top picks" puts Apple as
    /// the lead-mentioned entity without any rank-1 claim. Range [0, 1].
    /// Skipped (no row) when no scoped answers had any mentions —
    /// same denominator-zero pattern as <see cref="BrandShareOfVoice"/>.
    /// </summary>
    public const string BrandFirstMentionRate = "BrandFirstMentionRate";

    /// <summary>
    /// Mean of <c>AnswerSignal.BrandRecommendationScore</c> across signals
    /// where the brand was mentioned. Range [-1.0, +1.0] — finer-grained
    /// companion to <see cref="BrandRecommendationStrength"/> distribution.
    /// Omitted (no row) when no signals in scope had the brand mentioned —
    /// same denominator-zero pattern as <see cref="BrandSentimentScore"/>.
    /// </summary>
    public const string BrandRecommendationScore = "BrandRecommendationScore";

    /// <summary>
    /// Brand's share of all recommendations in scope — brand-recommended
    /// mention count / total recommended (brand + competitor) mention count.
    /// Distinct from <see cref="BrandRecommendationRate"/> (rate per answer):
    /// recommendation share answers "of all recommendations the AI made, what
    /// fraction went to our brand?". Skipped (no row) when no recommendations
    /// exist in scope — same denominator-zero pattern as
    /// <see cref="BrandShareOfVoice"/>.
    /// </summary>
    public const string BrandRecommendationShare = "BrandRecommendationShare";

    /// <summary>
    /// Fraction of answers in scope where the brand is entirely absent —
    /// not mentioned in the answer text AND no owned citation appears in
    /// the answer. Stricter than <c>1 - BrandMentionRate</c> because it
    /// also catches "brand's site was cited but the brand wasn't named"
    /// (still a visibility signal). Range [0, 1]. Skipped (no row) when
    /// the scope has no answers — same denominator-zero pattern as the
    /// existing rate metrics.
    /// </summary>
    public const string BrandAbsenceRate = "BrandAbsenceRate";

    /// <summary>
    /// Average rank-universe size across answers where the brand was ranked
    /// AND the LLM reported a universe size. Companion to
    /// <see cref="AverageBrandRank"/> — gives the rank a denominator
    /// (rank 3 of ~5 vs rank 3 of ~50 read very differently). Skipped (no
    /// row) when no ranked answers reported a universe size.
    /// </summary>
    public const string AverageBrandRankUniverseSize = "AverageBrandRankUniverseSize";

    /// <summary>
    /// Mean <see cref="AnswerSignal.AnswerCertainty"/> across all answers in
    /// scope. Range [0, 1]. Phase 4 measurement-model expansion (item 12).
    /// Always emitted when the scope has ≥1 answer — every AnswerSignal
    /// carries an AnswerCertainty value (defaulted to 0.5 when the LLM
    /// omits it). Distinct from the existing ConfidenceScore aggregate,
    /// which measures the extractor's confidence.
    /// </summary>
    public const string AverageAnswerCertainty = "AverageAnswerCertainty";

    // -- Cross-scan momentum (Phase 4 measurement-model expansion, item 20) --

    /// <summary>
    /// Change in <see cref="BrandMentionRate"/> versus the previous completed
    /// scan for the same tracker (current - previous). Positive = visibility
    /// rising, negative = decay. Range [-1.0, +1.0]. Skipped (no row) when no
    /// previous completed scan exists. Always at Overall scope only — comparing
    /// per-platform/lens slices across scans is unreliable because the platform
    /// or lens mix can shift between scans.
    /// </summary>
    public const string BrandMentionRateMomentum = "BrandMentionRateMomentum";

    /// <summary>
    /// Change in <see cref="BrandShareOfVoice"/> versus the previous completed
    /// scan (current - previous). Positive = gaining ground vs competitors,
    /// negative = losing share. Range [-1.0, +1.0]. Overall scope only; same
    /// skip-on-no-previous rule as <see cref="BrandMentionRateMomentum"/>.
    /// </summary>
    public const string BrandShareOfVoiceMomentum = "BrandShareOfVoiceMomentum";

    /// <summary>
    /// Change in <see cref="BrandAbsenceRate"/> versus the previous completed
    /// scan (current - previous). UNLIKE the other momentum metrics, lower is
    /// better here — a positive delta means the brand is now absent from more
    /// answers. FE should style direction inverted (red on +, green on -).
    /// </summary>
    public const string BrandAbsenceRateMomentum = "BrandAbsenceRateMomentum";

    // -- Per-competitor metrics (Competitor scope only — scope_id = competitor.id) --

    /// <summary>Mentions targeting this tracked competitor.</summary>
    public const string MentionCount = "MentionCount";

    /// <summary>Mentions targeting this tracked competitor with is_recommended=true.</summary>
    public const string RecommendationCount = "RecommendationCount";

    /// <summary>
    /// Distinct AIAnswers in which BOTH the tracked brand and this competitor
    /// were mentioned (Phase 4 measurement-model expansion, co-mention slice).
    /// Different from <see cref="MentionCount"/> which counts the competitor's
    /// raw mentions regardless of whether the brand also appeared.
    /// "Co-mention" tells you the competitor shares the conversation with us;
    /// a competitor with many mentions but zero co-mentions is in a separate
    /// conversation entirely. Always emitted (0 when no co-mentions in scope).
    /// </summary>
    public const string CoMentionedWithBrandCount = "CoMentionedWithBrandCount";

    /// <summary>
    /// Per-competitor share of voice — this competitor's mentions divided by
    /// total (brand + competitor) mentions across the entire scan. Same
    /// denominator semantics as <see cref="BrandShareOfVoice"/> at Overall
    /// scope; emitted at Competitor scope so each competitor gets a row.
    /// Range [0, 1]. Skipped (no row) only when the total mention count is
    /// zero, which already prevents the per-competitor MentionCount row from
    /// existing — denominator-zero is unreachable in practice.
    /// </summary>
    public const string CompetitorShareOfVoice = "CompetitorShareOfVoice";

    /// <summary>
    /// Per-competitor share of recommendations — this competitor's
    /// recommended mentions divided by total recommended (brand + competitor)
    /// mentions across the entire scan. Companion to
    /// <see cref="BrandRecommendationShare"/>. Range [0, 1]. Skipped when
    /// total recommendations across the scan is zero (no row), or when the
    /// competitor itself was never recommended (0 numerator → row would be
    /// emitted with 0 if a recommendation exists somewhere; otherwise no row
    /// when the denominator is zero).
    /// </summary>
    public const string CompetitorRecommendationShare = "CompetitorRecommendationShare";

    // -- Co-mention breadth (Overall scope only) --

    /// <summary>
    /// Count of distinct tracked competitors that appeared in at least one
    /// answer alongside the tracked brand (Phase 4 measurement-model
    /// expansion). The breadth of the competitive landscape the AI sees
    /// for us: a brand mentioned alongside 1 competitor lives in a tight
    /// pairwise comparison; alongside 8 is in a broader market view.
    /// </summary>
    public const string DistinctCoMentionedBrandCount = "DistinctCoMentionedBrandCount";

    // -- Citation counts (Overall / Platform / Lens / Topic scopes) --

    /// <summary>Total Citation rows.</summary>
    public const string CitationCount = "CitationCount";

    /// <summary>Citations classified Owned.</summary>
    public const string OwnedCitationCount = "OwnedCitationCount";

    /// <summary>Citations classified Competitor.</summary>
    public const string CompetitorCitationCount = "CompetitorCitationCount";

    /// <summary>Citations classified ThirdParty.</summary>
    public const string ThirdPartyCitationCount = "ThirdPartyCitationCount";

    /// <summary>
    /// Citations classified Unknown (no URL to classify by, or URL present
    /// but not matching brand or any tracked competitor and Slice (c) chose
    /// not to default unmatched URLs to ThirdParty). The four classification
    /// counts (Owned + Competitor + ThirdParty + Unknown) MUST sum to
    /// <see cref="CitationCount"/>; that invariant is what motivates having
    /// this metric.
    /// </summary>
    public const string UnknownCitationCount = "UnknownCitationCount";

    // -- Aggregate metrics added in the Slice (c) follow-up (ADR-003 carry-over). --

    /// <summary>
    /// Brand share of voice: brand mentions / (brand + competitor mentions),
    /// in [0, 1]. Products don't count toward the denominator — they're a
    /// different conversation. Omitted (no row emitted) when the denominator
    /// is zero (no brand AND no competitor mentions in scope).
    /// </summary>
    public const string BrandShareOfVoice = "BrandShareOfVoice";

    /// <summary>
    /// Distribution of <c>BrandSentiment</c> across scoped AnswerSignals.
    /// Emitted as multiple rows (one per observed sentiment value) with
    /// <c>metadata_json={"value":"Positive"|"Neutral"|"Negative"|"Mixed"|"Unknown"}</c>
    /// and <c>metric_value</c> = signal count. Unobserved values produce no
    /// row — the shape matches the data, not the enum.
    /// </summary>
    public const string BrandSentimentDistribution = "BrandSentimentDistribution";

    /// <summary>
    /// Top-5 most-cited sources (by <c>NormalizedSourceName</c>) in scope.
    /// Emitted as up to 5 rows with <c>metadata_json={"source_name":"X","rank":N}</c>
    /// and <c>metric_value</c> = citation count. Ties broken by source name
    /// for deterministic ordering. Fewer than 5 distinct sources → fewer rows.
    /// </summary>
    public const string TopCitedSource = "TopCitedSource";

    /// <summary>
    /// Top-N attributes the AI ascribed to the brand within scope (Phase 4
    /// measurement-model expansion, item #10). Emitted as up to 10 rows
    /// per scope with
    /// <c>metadata_json={"attribute":"in-depth analysis","polarity":"Positive","rank":N}</c>
    /// and <c>metric_value</c> = count of brand mentions tagged with the
    /// attribute in scope. Polarity at the aggregate level = mode polarity
    /// across the attribute's mentions. Ties broken alphabetically on the
    /// attribute name. Fewer than 10 distinct attributes → fewer rows;
    /// zero brand attributes → no rows.
    /// </summary>
    public const string BrandTopAttribute = "BrandTopAttribute";
}
