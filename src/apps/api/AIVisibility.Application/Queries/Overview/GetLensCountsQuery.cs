using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Per-lens mention counts for the current workspace + date window,
/// deliberately NOT scoped to any lens filter (the FE shows these
/// counts next to lens rows in the selector so the user can spot which
/// lenses carry mention data before toggling).
/// </summary>
public record GetLensCountsQuery(DateTime? From, DateTime? To)
    : IRequest<IReadOnlyList<LensCountDto>>;

/// <summary>One row per Visibility Lens.</summary>
public sealed record LensCountDto(
    /// <summary>Lens code (matches <c>Lens.Code</c>).</summary>
    string LensCode,
    /// <summary>Number of mentions extracted from answers whose prompt is in this lens.</summary>
    int MentionCount);
