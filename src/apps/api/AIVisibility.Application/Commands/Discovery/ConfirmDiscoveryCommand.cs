using MediatR;

namespace AIVisibility.Application.Commands.Discovery;

public record ConfirmDiscoveryCommand(
    Guid BrandId,
    ConfirmBrandProfileInput? BrandProfile,
    List<ConfirmCandidateInput> Products,
    List<ConfirmCandidateInput> Audiences,
    List<ConfirmCandidateInput> Markets,
    List<ConfirmCandidateInput> Topics,
    List<ConfirmCandidateInput> Competitors,
    List<ConfirmCandidateInput> TrustSignals,
    List<string>? Aliases = null) : IRequest<Unit>;

public record ConfirmCandidateInput(
    string Name,
    string? Description,
    double Confidence,
    string Source,
    Dictionary<string, string>? Metadata);

public record ConfirmBrandProfileInput(
    string? ShortDescription,
    string? Industry,
    string? Category,
    string? Positioning,
    double Confidence,
    string Source);
