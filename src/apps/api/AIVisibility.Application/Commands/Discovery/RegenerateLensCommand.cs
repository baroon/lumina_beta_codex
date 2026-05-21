using MediatR;

namespace AIVisibility.Application.Commands.Discovery;

public record RegenerateLensCommand(
    Guid BrandId,
    string Lens,
    string? Industry,
    string? Category,
    List<string> Products,
    List<string> Audiences,
    List<string> Markets,
    List<string>? Topics = null,
    List<string>? Competitors = null,
    List<string>? TrustSignals = null,
    List<string>? Exclude = null) : IRequest<RegenerateLensResultDto>;

public record RegenerateLensResultDto(
    string Lens,
    List<ResuggestCandidateDto> Candidates);
