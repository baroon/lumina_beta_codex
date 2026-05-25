using MediatR;

namespace AIVisibility.Application.Queries.Trackers;

/// <summary>Data for the "Ready to create Visibility Tracker" screen (REQ-002 FR-001).</summary>
public record GetTrackerSetupPreviewQuery(Guid BrandId) : IRequest<TrackerSetupPreviewDto?>;

public record TrackerSetupPreviewDto(
    Guid BrandId,
    string BrandName,
    string SuggestedName,
    string? MarketName,
    string? Category,
    int TopicCount,
    int CompetitorCount,
    int ProductCount,
    int AudienceCount,
    int MarketCount,
    int VisibilityLensCount,
    int PromptAllocation);
