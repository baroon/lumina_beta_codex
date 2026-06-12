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
            "Use the optional sections below (absence, attributes, risk flags, comparisons, topic ownership, claims) " +
            "to pick the actionable observation — they only appear when the signal has data. " +
            "Speak in second person ('you') when referring to the tracked brand.");
        sb.AppendLine();
        sb.AppendLine($"Window: {FormatWindow(overview.From, overview.To)}");
        sb.AppendLine($"Scans in window: {overview.ScanCount}");
        sb.AppendLine($"Total queries: {overview.Hero.Queries}");
        sb.AppendLine($"Total brand mentions: {overview.Hero.Mentions}");
        sb.AppendLine($"Total citations: {overview.Hero.Citations}");
        sb.AppendLine(
            $"Brand mention rate: {FormatPercentage(overview.Hero.BrandMentionRate)}");
        if (overview.Hero.BrandAbsenceRate is not null)
            sb.AppendLine(
                $"Brand absence rate: {FormatPercentage(overview.Hero.BrandAbsenceRate)} (fraction of answers with no brand mention AND no owned citation)");
        if (overview.Hero.BrandFirstMentionRate is not null)
            sb.AppendLine(
                $"Brand first-mention rate: {FormatPercentage(overview.Hero.BrandFirstMentionRate)} (fraction of answers where you are named first)");
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

        // Optional measurement-model sections. Each one is silently
        // omitted when the underlying list is empty so the LLM isn't
        // distracted by "Top attributes: (none)" framings.
        if (overview.TopBrandAttributes.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Top attributes the AI ascribes to your brand:");
            foreach (var a in overview.TopBrandAttributes)
                sb.AppendLine($"  - \"{a.Name}\" ({a.Polarity}) — {a.MentionCount} mentions");
        }

        if (overview.TopBrandRiskFlags.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Risk flags raised against your brand:");
            foreach (var f in overview.TopBrandRiskFlags)
                sb.AppendLine($"  - {f.FlagType} ({f.Severity}) — {f.MentionCount} mentions");
        }

        if (overview.TopBrandComparisons.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Head-to-head comparisons (per aspect):");
            foreach (var c in overview.TopBrandComparisons)
                sb.AppendLine($"  - {c.Aspect}: {c.WinCount} wins, {c.LossCount} losses");
        }

        if (overview.TopicOwnership.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Topic ownership (brand-mentioned prompts / total prompts on topic):");
            foreach (var t in overview.TopicOwnership)
                sb.AppendLine(
                    $"  - \"{t.TopicName}\": {t.BrandMentionedPromptCount} / {t.PromptCount}");
        }

        if (overview.CoMentions.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Competitor co-mentions (answers where both you and the competitor appeared):");
            foreach (var co in overview.CoMentions)
                sb.AppendLine(
                    $"  - {co.CompetitorName}: {co.CoMentionCount} co-mentions / {co.CompetitorMentionCount} competitor mentions");
        }

        if (overview.RecentFactualClaims.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Recent factual claims the AI made about you (newest first):");
            foreach (var fc in overview.RecentFactualClaims)
                sb.AppendLine(
                    $"  - [{fc.ReviewStatus}] {fc.Subject} = \"{fc.AssertedValue}\" ({fc.BrandName})");
        }

        return sb.ToString();
    }

    private static string FormatPercentage(double? value) =>
        value is null ? "—" : $"{Math.Round(value.Value * 100)}%";

    private static string FormatWindow(DateTime? from, DateTime to) =>
        from is null
            ? $"all time through {to:yyyy-MM-dd}"
            : $"{from:yyyy-MM-dd} through {to:yyyy-MM-dd}";
}
