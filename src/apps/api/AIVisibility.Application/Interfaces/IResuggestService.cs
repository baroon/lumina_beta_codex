using AIVisibility.Domain.Entities;

namespace AIVisibility.Application.Interfaces;

public interface IResuggestService
{
    Task<ResuggestResult> ResuggestAsync(
        ResuggestContext context,
        CancellationToken cancellationToken = default);
}

public record ResuggestContext(
    string BrandName,
    string? Industry,
    string? Category,
    List<string> Products,
    List<string> Audiences,
    List<string> Markets);

public record ResuggestResult(
    List<Competitor> Competitors,
    List<Topic> Topics);
