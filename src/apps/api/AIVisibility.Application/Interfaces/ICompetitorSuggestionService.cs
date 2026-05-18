using AIVisibility.Domain.Entities;

namespace AIVisibility.Application.Interfaces;

public interface ICompetitorSuggestionService
{
    Task<List<Competitor>> SuggestCompetitorsAsync(string brandName, string? industry, string? category, CancellationToken cancellationToken = default);
}
