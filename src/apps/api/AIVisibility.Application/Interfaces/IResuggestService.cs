using AIVisibility.Domain.Entities;

namespace AIVisibility.Application.Interfaces;

public interface IResuggestService
{
    Task<ResuggestResult> ResuggestAsync(
        ResuggestContext context,
        CancellationToken cancellationToken = default);

    Task<LensRegenerateResult> RegenerateLensAsync(
        ResuggestContext context, string lens, CancellationToken ct);
}

public record ResuggestContext(
    string BrandName,
    string? Industry,
    string? Category,
    List<string> Products,
    List<string> Audiences,
    List<string> Markets,
    List<string>? Topics = null,
    List<string>? Competitors = null,
    List<string>? TrustSignals = null,
    List<string>? Exclude = null);

public record ResuggestResult(
    List<Competitor> Competitors,
    List<Topic> Topics);

public record LensRegenerateResult(List<LensCandidate> Candidates);

public record LensCandidate(
    string Name,
    string? Description,
    double Confidence,
    string Source,
    Dictionary<string, object?> Metadata);
