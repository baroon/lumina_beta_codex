namespace AIVisibility.Domain.Entities;

/// <summary>
/// One entry in the ordered list of entities the AI recommended in an answer.
/// Captures the full ordered list so per-position aggregates
/// (rank-1-of-recommendations, average brand recommendation position) are
/// computable.
///
/// Created by <c>SignalExtractor</c> per answer. Append-only (D16). Names
/// stored verbatim from the LLM plus a normalized form for grouping; no FK
/// to Brand/Competitor — the AI may recommend entities we don't track.
/// </summary>
public class AnswerRecommendation
{
    public Guid Id { get; set; }
    public Guid AIAnswerId { get; set; }

    /// <summary>Exact entity name as the LLM reported it.</summary>
    public string ClaimedName { get; set; } = string.Empty;
    /// <summary>Lowercase + canonical form for cross-answer grouping.</summary>
    public string NormalizedName { get; set; } = string.Empty;

    /// <summary>
    /// 1-based position in the answer's recommendation list. Position 1 is
    /// the AI's top recommendation; subsequent positions are progressively
    /// weaker endorsements. Always populated (the table only exists for
    /// ordered recommendations).
    /// </summary>
    public int Position { get; set; }

    public DateTime CreatedAt { get; set; }

    public AIAnswer AIAnswer { get; set; } = null!;
}
