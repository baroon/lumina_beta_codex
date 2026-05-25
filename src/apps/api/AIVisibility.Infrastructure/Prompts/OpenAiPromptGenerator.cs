using System.Text.Json;
using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Prompts;

/// <summary>
/// LLM-backed prompt generator. For each Visibility Check it asks OpenAI for fresh, natural
/// end-user prompts in that check's style, scoped to the brand's coverage and avoiding the Exclude
/// set (removed/kept prompts) — so refreshing yields genuinely new prompts. Falls back to the
/// deterministic <see cref="TemplatePromptGenerator"/> when the LLM is unavailable (e.g., no key).
/// </summary>
public class OpenAiPromptGenerator : IPromptGenerator
{
    private readonly IOpenAiService _openAi;
    private readonly TemplatePromptGenerator _fallback;
    private readonly ILogger<OpenAiPromptGenerator> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string SystemPrompt = """
        You write realistic prompts that real people type into an AI assistant (ChatGPT, Gemini,
        Perplexity) when researching a product category. They test whether a specific brand
        surfaces in AI answers.

        Make them authentic and varied:
        - Cover different buyer personas and scenarios — first-time buyer, switching vendors,
          technical evaluator, budget-conscious, enterprise vs. small team, a specific use case.
        - Vary the structure and phrasing — open questions, "best X for Y", "recommend...",
          comparisons, "is X worth it?". Never reuse the same skeleton twice.
        - Ground every prompt in THIS brand's niche: weave in its specific topics, products,
          audiences, market, and positioning so the prompts probe where this brand should appear,
          not generic category trivia.
        - Stay within the given Visibility Check's intent.
        - Do NOT mention the brand name unless the check is about comparison or sentiment.
        - Never repeat or paraphrase anything in the EXCLUDE list.

        Return ONLY a JSON array of objects, no prose:
        [{"prompt": "the question text", "topic": "one of the provided topics, or null"}]
        """;

    public OpenAiPromptGenerator(
        IOpenAiService openAi,
        TemplatePromptGenerator fallback,
        ILogger<OpenAiPromptGenerator> logger)
    {
        _openAi = openAi;
        _fallback = fallback;
        _logger = logger;
    }

    public async Task<IReadOnlyList<GeneratedPrompt>> GenerateAsync(
        PromptGenerationContext ctx,
        CancellationToken cancellationToken = default)
    {
        if (ctx.Templates.Count == 0 || ctx.PromptAllocation <= 0)
            return Array.Empty<GeneratedPrompt>();

        var checks = ctx.Templates.GroupBy(t => t.VisibilityCheckId).ToList();
        var perCheck = Math.Max(1, (int)Math.Ceiling((double)ctx.PromptAllocation / checks.Count));
        var topicByName = ctx.Topics
            .GroupBy(t => t.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.OrdinalIgnoreCase);

        var tasks = checks.Select(g =>
            GenerateForCheckAsync(
                ctx,
                g.Key,
                g.First().PromptTemplateId,
                g.First().CheckName,
                g.First().CheckDescription,
                g.Select(t => t.TemplateText).ToList(),
                perCheck,
                cancellationToken));
        var perCheckResults = await Task.WhenAll(tasks);

        var seen = new HashSet<string>(ctx.Exclude ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
        var results = new List<GeneratedPrompt>();
        foreach (var list in perCheckResults)
        {
            foreach (var item in list)
            {
                if (results.Count >= ctx.PromptAllocation) break;
                if (item.Text.Length == 0 || !seen.Add(item.Text)) continue;

                Guid? topicId =
                    item.TopicName != null && topicByName.TryGetValue(item.TopicName, out var tid)
                        ? tid
                        : null;
                results.Add(new GeneratedPrompt(
                    item.Text,
                    item.CheckId,
                    item.TemplateId,
                    topicId,
                    topicId.HasValue ? new List<Guid> { topicId.Value } : new List<Guid>(),
                    new List<Guid>()));
            }
        }

        // No key / all calls failed → deterministic fallback so prompts still generate.
        if (results.Count == 0)
            return await _fallback.GenerateAsync(ctx, cancellationToken);

        return results;
    }

    private async Task<List<RawPrompt>> GenerateForCheckAsync(
        PromptGenerationContext ctx,
        Guid checkId,
        Guid templateId,
        string checkName,
        string checkDescription,
        List<string> examples,
        int count,
        CancellationToken ct)
    {
        try
        {
            var user = BuildUserPrompt(ctx, checkName, checkDescription, examples, count);
            var response = await _openAi.ChatCompletionAsync(SystemPrompt, user, 1000, 0.9, ct);
            if (string.IsNullOrWhiteSpace(response)) return new List<RawPrompt>();

            var json = ExtractJson(response);
            var items = JsonSerializer.Deserialize<List<PromptItemDto>>(json, JsonOptions);
            if (items == null) return new List<RawPrompt>();

            return items
                .Where(i => !string.IsNullOrWhiteSpace(i.Prompt))
                .Select(i => new RawPrompt(i.Prompt!.Trim(), NormalizeTopic(i.Topic), checkId, templateId))
                .Take(count)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Prompt generation failed for Visibility Check {CheckId}", checkId);
            return new List<RawPrompt>();
        }
    }

    private static string? NormalizeTopic(string? topic) =>
        string.IsNullOrWhiteSpace(topic) || topic.Equals("null", StringComparison.OrdinalIgnoreCase)
            ? null
            : topic.Trim();

    private static string BuildUserPrompt(
        PromptGenerationContext ctx,
        string checkName,
        string checkDescription,
        List<string> examples,
        int count)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(checkName))
            parts.Add(
                string.IsNullOrWhiteSpace(checkDescription)
                    ? $"Visibility Check: {checkName}"
                    : $"Visibility Check: {checkName} — {checkDescription}");
        parts.Add($"Brand: \"{ctx.BrandName}\"");
        if (!string.IsNullOrWhiteSpace(ctx.Category)) parts.Add($"Category: {ctx.Category}");
        if (!string.IsNullOrWhiteSpace(ctx.Industry)) parts.Add($"Industry: {ctx.Industry}");
        if (!string.IsNullOrWhiteSpace(ctx.Positioning)) parts.Add($"Positioning: {ctx.Positioning}");
        if (!string.IsNullOrWhiteSpace(ctx.MarketName)) parts.Add($"Market: {ctx.MarketName}");
        if (ctx.Topics.Count > 0)
            parts.Add($"Topics: {string.Join(", ", ctx.Topics.Select(t => t.Name))}");
        if (ctx.Products is { Count: > 0 })
            parts.Add($"Products/services: {string.Join(", ", ctx.Products)}");
        if (ctx.Audiences is { Count: > 0 })
            parts.Add($"Audiences: {string.Join(", ", ctx.Audiences)}");
        if (ctx.Competitors.Count > 0)
            parts.Add($"Competitors: {string.Join(", ", ctx.Competitors.Select(c => c.Name))}");
        parts.Add("Example phrasing for this check:\n- " + string.Join("\n- ", examples));
        if (ctx.Exclude is { Count: > 0 })
            parts.Add("EXCLUDE (do not repeat or paraphrase): " + string.Join(" | ", ctx.Exclude));
        parts.Add(
            $"\nWrite {count} DISTINCT prompts for this check — vary persona, scenario, and phrasing. "
            + "Return the JSON array only.");
        return string.Join("\n", parts);
    }

    private static string ExtractJson(string response)
    {
        var trimmed = response.Trim();
        if (trimmed.StartsWith("```"))
        {
            var firstNewline = trimmed.IndexOf('\n');
            if (firstNewline > 0) trimmed = trimmed[(firstNewline + 1)..];
            if (trimmed.EndsWith("```")) trimmed = trimmed[..^3];
            trimmed = trimmed.Trim();
        }

        var arrStart = trimmed.IndexOf('[');
        if (arrStart >= 0)
        {
            var end = trimmed.LastIndexOf(']');
            if (end > arrStart) return trimmed[arrStart..(end + 1)];
        }

        return trimmed;
    }

    private record PromptItemDto(string? Prompt, string? Topic);

    private record RawPrompt(string Text, string? TopicName, Guid CheckId, Guid TemplateId);
}
