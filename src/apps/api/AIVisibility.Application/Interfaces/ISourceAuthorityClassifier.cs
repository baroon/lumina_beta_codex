namespace AIVisibility.Application.Interfaces;

/// <summary>
/// Resolves a curated authority score for a source domain (Phase 4
/// measurement-model expansion, item 16). Range [0, 100]; null means
/// "no opinion" (domain not on the curated list, classifier should not
/// guess). Called by <c>AnswerSignalWriter</c> when persisting newly-seen
/// Source rows; existing Source rows keep their previously-resolved score.
///
/// The v1 implementation is a static allowlist of well-known domains.
/// Future implementations may consult an external API (Moz DA, Ahrefs)
/// or a per-workspace override table — the interface is shaped to allow
/// either without callers changing.
/// </summary>
public interface ISourceAuthorityClassifier
{
    /// <summary>
    /// Returns the authority score [0, 100] for the supplied normalized
    /// domain. Null = unknown domain; the Source.AuthorityScore column
    /// stays null in that case so aggregations can treat "no data"
    /// distinctly from "low authority".
    /// </summary>
    double? Score(string? normalizedDomain);
}
