using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Prompts;

/// <summary>
/// Deterministic template-fill prompt generator. Walks topics × templates (balanced across
/// Visibility Checks), fills placeholders from coverage, and caps at PromptAllocation.
/// Templates that require a {competitor} are skipped when the tracker has no competitors.
/// </summary>
public class TemplatePromptGenerator : IPromptGenerator
{
    public IReadOnlyList<GeneratedPrompt> Generate(PromptGenerationContext ctx)
    {
        var results = new List<GeneratedPrompt>();
        if (ctx.Templates.Count == 0 || ctx.PromptAllocation <= 0) return results;

        var category = string.IsNullOrWhiteSpace(ctx.Category) ? ctx.BrandName : ctx.Category!;
        var market = string.IsNullOrWhiteSpace(ctx.MarketName) ? "your market" : ctx.MarketName!;
        // Fall back to a single synthetic "topic" (the category) so category-only prompts still generate.
        var topics = ctx.Topics.Count > 0 ? ctx.Topics : new List<CoverageRef> { new(Guid.Empty, category) };
        var competitorIndex = 0;

        foreach (var topic in topics)
        {
            foreach (var template in ctx.Templates)
            {
                if (results.Count >= ctx.PromptAllocation) return results;

                var needsCompetitor = template.TemplateText.Contains("{competitor}");
                if (needsCompetitor && ctx.Competitors.Count == 0) continue;

                var competitor = needsCompetitor
                    ? ctx.Competitors[competitorIndex++ % ctx.Competitors.Count]
                    : null;

                var text = template.TemplateText
                    .Replace("{brand}", ctx.BrandName)
                    .Replace("{category}", category)
                    .Replace("{market}", market)
                    .Replace("{topic}", topic.Name)
                    .Replace("{competitor}", competitor?.Name ?? string.Empty)
                    .Trim();

                Guid? primaryTopicId = topic.Id == Guid.Empty ? null : topic.Id;
                results.Add(new GeneratedPrompt(
                    text,
                    template.VisibilityCheckId,
                    template.PromptTemplateId,
                    primaryTopicId,
                    primaryTopicId.HasValue ? new List<Guid> { primaryTopicId.Value } : new List<Guid>(),
                    competitor != null ? new List<Guid> { competitor.Id } : new List<Guid>()));
            }
        }

        return results;
    }
}
