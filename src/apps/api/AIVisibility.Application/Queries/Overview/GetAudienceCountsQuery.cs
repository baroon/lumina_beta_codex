using MediatR;

namespace AIVisibility.Application.Queries.Overview;

/// <summary>
/// Per-audience mention counts for the current workspace + date window,
/// deduplicated by audience name (case-insensitive). Drives the count
/// chip on the audience pill. Deliberately unfiltered by the active
/// audience selection so the chip stays stable as the user toggles.
/// </summary>
public record GetAudienceCountsQuery(DateTime? From, DateTime? To)
    : IRequest<IReadOnlyList<AudienceCountDto>>;

public sealed record AudienceCountDto(string AudienceName, int MentionCount);
