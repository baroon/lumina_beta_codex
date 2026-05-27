namespace AIVisibility.Domain.Enums;

/// <summary>
/// Generic sentiment value for an AI answer or entity mention (Phase 3 plan D13).
/// Used by AnswerSignal.BrandSentiment AND Mention.Sentiment — property names
/// carry the context, the enum is shared.
///
/// Unknown = absence of mention or insufficient signal. NEVER means "negative
/// by default" — absence is not negative (NFR-004 from ADR-003).
/// </summary>
public enum Sentiment
{
    Positive,
    Neutral,
    Negative,
    Mixed,
    Unknown,
}
