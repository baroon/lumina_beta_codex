using MediatR;

namespace AIVisibility.Application.Commands.Discovery;

public record RegenerateLensCommand(
    Guid BrandId,
    string Lens,
    string? Industry,
    string? Category,
    List<string> Products,
    List<string> Audiences,
    List<string> Markets) : IRequest<RegenerateLensResultDto>;

public record RegenerateLensResultDto(
    string Lens,
    List<ResuggestCandidateDto> Candidates);
