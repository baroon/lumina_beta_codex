using AIVisibility.Application.Commands.Discovery;

namespace AIVisibility.Api.DTOs;

public record ConfirmDiscoveryRequest(
    ConfirmBrandProfileInput? BrandProfile,
    List<ConfirmCandidateInput>? Products,
    List<ConfirmCandidateInput>? Audiences,
    List<ConfirmCandidateInput>? Markets,
    List<ConfirmCandidateInput>? Topics,
    List<ConfirmCandidateInput>? Competitors,
    List<ConfirmCandidateInput>? TrustSignals,
    List<string>? Aliases = null);
