namespace AIVisibility.Domain.Enums;

/// <summary>
/// Polarity of a <see cref="Entities.MentionAttribute"/> — the AI's
/// stance on the specific quality, independent of the overall mention
/// sentiment. "Slow to break news" is a Negative attribute even when
/// the broader mention is Positive ("reliable for analysis").
/// </summary>
public enum AttributePolarity
{
    Positive,
    Neutral,
    Negative,
}
