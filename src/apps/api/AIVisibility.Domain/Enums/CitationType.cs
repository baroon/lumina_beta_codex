namespace AIVisibility.Domain.Enums;

/// <summary>
/// Whether a citation is an explicit URL or a "mentioned source" without URL
/// (Phase 3 plan §3, D14). E.g. an answer that says "according to Trustpilot"
/// is a <see cref="MentionedSource"/>; an answer with a markdown link is
/// <see cref="ExplicitUrl"/>.
/// </summary>
public enum CitationType
{
    ExplicitUrl,
    MentionedSource,
}
