using MediatR;

namespace AIVisibility.Application.Queries.Discovery;

public record GetDiscoveryResultsQuery(Guid BrandId) : IRequest<DiscoveryResultsDto?>;

public record DiscoveryResultsDto(
    Guid BrandId,
    string BrandName,
    string Status,
    BrandProfileDto? BrandProfile,
    List<CandidateDto> Products,
    List<CandidateDto> Audiences,
    List<CandidateDto> Markets,
    List<CandidateDto> Topics,
    List<CandidateDto> Competitors,
    List<CandidateDto> TrustSignals);

public record BrandProfileDto(
    Guid Id,
    string? ShortDescription,
    string? Industry,
    string? Category,
    string? Positioning,
    double Confidence,
    string Source,
    string Status);

public record CandidateDto(
    Guid Id,
    string Name,
    string? Description,
    double Confidence,
    string Source,
    string Status,
    Dictionary<string, object?> Metadata);
