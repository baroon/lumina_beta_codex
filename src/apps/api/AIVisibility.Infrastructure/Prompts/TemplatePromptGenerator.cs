using AIVisibility.Application.Interfaces;

namespace AIVisibility.Infrastructure.Prompts;

/// <summary>
/// Deterministic template-fill prompt generator. Each template is varied over the dimension it
/// actually references — topics (for {topic}), competitors (for {competitor}), or nothing — so
/// topic-less templates produce a single prompt instead of one identical copy per topic. Texts
/// are de-duplicated, the Exclude set (removed/kept prompts) is honoured, and output is capped at
/// PromptAllocation.
/// </summary>
public class TemplatePromptGenerator : IPromptGenerator
{
    public IReadOnlyList<GeneratedPrompt> Generate(PromptGenerationContext ctx)
    {
        var results = new List<GeneratedPrompt>();
        if (ctx.Templates.Count == 0 || ctx.PromptAllocation <= 0) return results;

        var category = string.IsNullOrWhiteSpace(ctx.Category) ? ctx.BrandName : ctx.Category!;
        var market = string.IsNullOrWhiteSpace(ctx.MarketName) ? "your market" : ctx.MarketName!;

        // Texts already removed or kept (Exclude) plus everything produced this run — never emit twice.
        var seen = ctx.Exclude is { Count: > 0 }
            ? new HashSet<string>(ctx.Exclude, StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var competitorIndex = 0;

        bool Emit(PromptTemplateInput template, CoverageRef? topic, CoverageRef? competitor)
        {
            if (results.Count >= ctx.PromptAllocation) return false; // budget exhausted — stop

            var text = template.TemplateText
                .Replace("{brand}", ctx.BrandName)
                .Replace("{category}", category)
                .Replace("{market}", market)
                .Replace("{topic}", topic?.Name ?? category)
                .Replace("{competitor}", competitor?.Name ?? string.Empty)
                .Trim();

            if (!seen.Add(text)) return true; // duplicate or excluded — skip, keep going

            Guid? primaryTopicId = topic is not null && topic.Id != Guid.Empty ? topic.Id : null;
            results.Add(new GeneratedPrompt(
                text,
                template.VisibilityCheckId,
                template.PromptTemplateId,
                primaryTopicId,
                primaryTopicId.HasValue ? new List<Guid> { primaryTopicId.Value } : new List<Guid>(),
                competitor is not null ? new List<Guid> { competitor.Id } : new List<Guid>()));
            return true;
        }

        foreach (var template in ctx.Templates)
        {
            var needsTopic = template.TemplateText.Contains("{topic}");
            var needsCompetitor = template.TemplateText.Contains("{competitor}");
            if (needsCompetitor && ctx.Competitors.Count == 0) continue; // can't fill — skip template

            if (needsTopic)
            {
                // Fall back to a single synthetic topic (the category) when none are configured.
                var topics =
                    ctx.Topics.Count > 0 ? ctx.Topics : new List<CoverageRef> { new(Guid.Empty, category) };
                foreach (var topic in topics)
                {
                    var competitor = needsCompetitor
                        ? ctx.Competitors[competitorIndex++ % ctx.Competitors.Count]
                        : null;
                    if (!Emit(template, topic, competitor)) return results;
                }
            }
            else if (needsCompetitor)
            {
                foreach (var competitor in ctx.Competitors)
                {
                    if (!Emit(template, null, competitor)) return results;
                }
            }
            else if (!Emit(template, null, null))
            {
                return results;
            }
        }

        return results;
    }
}
