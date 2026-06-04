namespace AIVisibility.Domain.Entities;

/// <summary>
/// One unordered pair of entities that co-occurred in the same
/// <see cref="AIAnswer"/> (Phase 4 measurement-model expansion, item #8).
/// Powers the "competitive landscape" view: when our brand was named in an
/// answer, which competitors / products were named alongside?
///
/// Stored canonical: <see cref="MentionAId"/> is always &lt; <see cref="MentionBId"/>
/// by Guid ordering so a pair is recorded once, not twice. Generated at
/// extraction time by <c>AnswerSignalWriter</c> after the per-answer
/// Mentions land. Append-only (D16); cascade-deleted with its
/// <see cref="AIAnswer"/>.
/// </summary>
public class MentionPair
{
    public Guid Id { get; set; }
    public Guid AIAnswerId { get; set; }
    public Guid MentionAId { get; set; }
    public Guid MentionBId { get; set; }
    public DateTime CreatedAt { get; set; }

    public AIAnswer AIAnswer { get; set; } = null!;
    public Mention MentionA { get; set; } = null!;
    public Mention MentionB { get; set; } = null!;
}
