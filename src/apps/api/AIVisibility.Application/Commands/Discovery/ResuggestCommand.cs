using MediatR;

namespace AIVisibility.Application.Commands.Discovery;

public record ResuggestCommand(
    Guid BrandId,
    string? Industry,
    string? Category,
    List<string> Products,
    List<string> Audiences,
    List<string> Markets) : IRequest<ResuggestResultDto>;

public record ResuggestResultDto(
    List<ResuggestCandidateDto> Competitors,
    List<ResuggestCandidateDto> Topics);

public record ResuggestCandidateDto(
    string Name,
    string? Description,
    double Confidence,
    string Source,
    Dictionary<string, object?> Metadata);
