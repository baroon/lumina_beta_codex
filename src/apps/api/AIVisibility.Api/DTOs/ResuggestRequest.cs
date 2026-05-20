namespace AIVisibility.Api.DTOs;

public record ResuggestRequest(
    string? Industry,
    string? Category,
    List<string> Products,
    List<string> Audiences,
    List<string> Markets,
    List<string>? Topics = null,
    List<string>? Competitors = null,
    List<string>? TrustSignals = null);
