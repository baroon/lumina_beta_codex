using System.Text;
using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using MediatR;

namespace AIVisibility.Application.Queries.Insights;

public class GenerateInsightsNarrativeQueryHandler
    : IRequestHandler<GenerateInsightsNarrativeQuery, InsightsNarrativeDto>
{
    private const string PreferredPlatform = "openai";

    private readonly IMediator _mediator;
    private readonly IScanProvider _scanProvider;

    public GenerateInsightsNarrativeQueryHandler(IMediator mediator, IScanProvider scanProvider)
    {
        _mediator = mediator;
        _scanProvider = scanProvider;
    }

    public async Task<InsightsNarrativeDto> Handle(
        GenerateInsightsNarrativeQuery request, CancellationToken cancellationToken)
    {
        if (!_scanProvider.IsConfigured(PreferredPlatform))
            throw new InvalidOperationException(
                $"The '{PreferredPlatform}' platform is not configured. Add an API key first.");

        // Reuse the existing overview query so the LLM sees the exact
        // same snapshot the InsightsScreen renders. No duplication of
        // aggregation logic and the FE/LLM stay in sync as the overview
        // shape evolves.
        var overview = await _mediator.Send(
            new GetWorkspaceOverviewQuery(
                request.From, request.To, null, null, null, null, null, request.TrackerIds),
            cancellationToken);

        var prompt = BuildPrompt(overview);
        var answer = await _scanProvider.GetAnswerAsync(PreferredPlatform, prompt, cancellationToken);

        if (!answer.Success)
            throw new InvalidOperationException(
                answer.Error ?? "The LLM did not return a successful response.");

        return new InsightsNarrativeDto(answer.Text.Trim(), PreferredPlatform);
    }

    public static string BuildPrompt(WorkspaceOverviewDto overview)
    {
        var sb = new StringBuilder();
        sb.AppendLine(
            "You are an analyst writing a short executive summary of an AI brand-visibility snapshot. " +
            "Write 2-3 sentences in plain language. No bullet points. No greetings. " +
            "Focus on the tracked brand's position, the gap to the leader if any, and one actionable observation. " +
            "Speak in second person ('you') when referring to the tracked brand.");
        sb.AppendLine();
        sb.AppendLine($"Window: {FormatWindow(overview.From, overview.To)}");
        sb.AppendLine($"Scans in window: {overview.ScanCount}");
        sb.AppendLine($"Total queries: {overview.Hero.Queries}");
        sb.AppendLine($"Total brand mentions: {overview.Hero.Mentions}");
        sb.AppendLine($"Total citations: {overview.Hero.Citations}");
        sb.AppendLine(
            $"Brand mention rate: {FormatPercentage(overview.Hero.BrandMentionRate)}");
        sb.AppendLine();

        var ranked = overview.TopEntities
            .OrderByDescending(e => e.Visibility ?? -1)
            .ToList();
        sb.AppendLine("Entity ranking (highest visibility first):");
        for (var i = 0; i < ranked.Count; i++)
        {
            var row = ranked[i];
            var label = row.IsTrackedBrand ? "[YOU] " : string.Empty;
            sb.AppendLine(
                $"  {i + 1}. {label}{row.Name} — visibility {FormatPercentage(row.Visibility)}, " +
                $"share of voice {FormatPercentage(row.ShareOfVoice)}, " +
                $"sentiment {row.Sentiment ?? "unknown"}");
        }

        if (ranked.Count == 0)
            sb.AppendLine("  (no entities ranked yet — the workspace has no scan data in window)");

        return sb.ToString();
    }

    private static string FormatPercentage(double? value) =>
        value is null ? "—" : $"{Math.Round(value.Value * 100)}%";

    private static string FormatWindow(DateTime? from, DateTime to) =>
        from is null
            ? $"all time through {to:yyyy-MM-dd}"
            : $"{from:yyyy-MM-dd} through {to:yyyy-MM-dd}";
}
