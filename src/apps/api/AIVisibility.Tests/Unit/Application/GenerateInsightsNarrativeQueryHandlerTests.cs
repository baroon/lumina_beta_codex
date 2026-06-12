using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Insights;
using AIVisibility.Application.Queries.Overview;
using FluentAssertions;
using MediatR;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// The handler is a thin orchestration layer: fetch overview → format
/// prompt → call IScanProvider → return text. Tests use stub IMediator
/// + IScanProvider implementations so the prompt-build, the not-
/// configured path, and the provider-error path are isolated from
/// the real LLM clients and the EF in-memory provider.
/// </summary>
public class GenerateInsightsNarrativeQueryHandlerTests
{
    private sealed class StubMediator : IMediator
    {
        public required WorkspaceOverviewDto Overview { get; init; }

        public Task<TResponse> Send<TResponse>(
            IRequest<TResponse> request, CancellationToken cancellationToken = default)
        {
            if (request is GetWorkspaceOverviewQuery)
                return Task.FromResult((TResponse)(object)Overview);
            throw new NotImplementedException(
                $"StubMediator does not handle {request.GetType().Name}");
        }

        public Task Send<TRequest>(TRequest request, CancellationToken cancellationToken = default)
            where TRequest : IRequest => throw new NotImplementedException();

        public Task<object?> Send(object request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task Publish(object notification, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task Publish<TNotification>(
            TNotification notification, CancellationToken cancellationToken = default)
            where TNotification : INotification => throw new NotImplementedException();

        public IAsyncEnumerable<TResponse> CreateStream<TResponse>(
            IStreamRequest<TResponse> request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public IAsyncEnumerable<object?> CreateStream(
            object request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
    }

    private sealed class StubScanProvider : IScanProvider
    {
        public bool ConfiguredOverride { get; init; } = true;
        public ScanAnswer NextAnswer { get; init; } = new(true, "Stub narrative.", null);
        public string? LastPrompt { get; private set; }
        public string? LastPlatformCode { get; private set; }

        public Task<ScanAnswer> GetAnswerAsync(
            string platformCode, string prompt, CancellationToken cancellationToken = default)
        {
            LastPlatformCode = platformCode;
            LastPrompt = prompt;
            return Task.FromResult(NextAnswer);
        }

        public bool IsConfigured(string platformCode) => ConfiguredOverride;
    }

    private static WorkspaceOverviewDto SampleOverview(int scanCount = 4) => new(
        WorkspaceId: Guid.NewGuid(),
        From: new DateTime(2026, 05, 10, 0, 0, 0, DateTimeKind.Utc),
        To: new DateTime(2026, 06, 09, 0, 0, 0, DateTimeKind.Utc),
        TrackedBrands: new[]
        {
            new TrackedBrandDto(Guid.NewGuid(), "Acme"),
        },
        Competitors: new[]
        {
            new WorkspaceCompetitorDto(Guid.NewGuid(), "Canva"),
        },
        ScanCount: scanCount,
        Hero: new WorkspaceHeroDto(
            Queries: 96, Mentions: 30, Citations: 12, BrandMentionRate: 0.5,
            BrandAbsenceRate: 0.5, BrandFirstMentionRate: 0.4),
        PreviousHero: null,
        Series: Array.Empty<EntityTrendSeriesDto>(),
        TopEntities: new[]
        {
            new WorkspaceTopEntityRowDto(
                "Brand", Guid.NewGuid(), "Acme",
                IsTrackedBrand: true,
                Visibility: 0.5, VisibilityDelta: 0.1,
                ShareOfVoice: 0.4, ShareOfVoiceDelta: 0.05,
                Sentiment: "Positive", SentimentDelta: 1),
            new WorkspaceTopEntityRowDto(
                "Competitor", Guid.NewGuid(), "Canva",
                IsTrackedBrand: false,
                Visibility: 0.8, VisibilityDelta: 0,
                ShareOfVoice: 0.6, ShareOfVoiceDelta: 0,
                Sentiment: "Neutral", SentimentDelta: 0),
        },
        TopBrandAttributes: Array.Empty<WorkspaceBrandAttributeDto>(),
        CoMentions: Array.Empty<WorkspaceCoMentionDto>(),
        TopBrandRiskFlags: Array.Empty<WorkspaceBrandRiskFlagDto>(),
        TopBrandComparisons: Array.Empty<WorkspaceBrandComparisonDto>(),
        TopicOwnership: Array.Empty<WorkspaceTopicOwnershipDto>(),
        RecentFactualClaims: Array.Empty<WorkspaceFactualClaimDto>());

    [Fact]
    public async Task Generate_ReturnsNarrativeText_AndPlatformCode_OnHappyPath()
    {
        var mediator = new StubMediator { Overview = SampleOverview() };
        var provider = new StubScanProvider
        {
            NextAnswer = new ScanAnswer(true, "  Acme is trailing Canva by 30 points.  ", null),
        };
        var handler = new GenerateInsightsNarrativeQueryHandler(mediator, provider);

        var result = await handler.Handle(
            new GenerateInsightsNarrativeQuery(null, null, null), CancellationToken.None);

        // Trimmed, platform set, prompt actually reached the provider.
        result.Narrative.Should().Be("Acme is trailing Canva by 30 points.");
        result.PlatformCode.Should().Be("openai");
        provider.LastPlatformCode.Should().Be("openai");
        provider.LastPrompt.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Generate_Throws_WhenPreferredPlatformIsNotConfigured()
    {
        var mediator = new StubMediator { Overview = SampleOverview() };
        var provider = new StubScanProvider { ConfiguredOverride = false };
        var handler = new GenerateInsightsNarrativeQueryHandler(mediator, provider);

        Func<Task> act = () => handler.Handle(
            new GenerateInsightsNarrativeQuery(null, null, null), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not configured*");
    }

    [Fact]
    public async Task Generate_Throws_WhenProviderReturnsFailure()
    {
        var mediator = new StubMediator { Overview = SampleOverview() };
        var provider = new StubScanProvider
        {
            NextAnswer = new ScanAnswer(false, string.Empty, "rate limited"),
        };
        var handler = new GenerateInsightsNarrativeQueryHandler(mediator, provider);

        Func<Task> act = () => handler.Handle(
            new GenerateInsightsNarrativeQuery(null, null, null), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*rate limited*");
    }

    // -----------------------------------------------------------------------
    // Prompt shape — guards against silent prompt drift. The structure
    // is what the LLM actually consumes, so changes here should be
    // deliberate (and reviewed against the production prompt prefix).
    // -----------------------------------------------------------------------

    [Fact]
    public void BuildPrompt_IncludesAllHeroCounts_AndMarksTrackedBrand()
    {
        var prompt = GenerateInsightsNarrativeQueryHandler.BuildPrompt(SampleOverview());

        prompt.Should().Contain("Total queries: 96");
        prompt.Should().Contain("Total brand mentions: 30");
        prompt.Should().Contain("Total citations: 12");
        prompt.Should().Contain("Brand mention rate: 50%");
        // The tracked brand row is prefixed [YOU] so the LLM can address
        // the user in second person.
        prompt.Should().Contain("[YOU] Acme");
        prompt.Should().Contain("Canva");
    }

    [Fact]
    public void BuildPrompt_RanksByVisibilityDescending()
    {
        // Canva 80%, Acme 50% — Canva should appear first.
        var prompt = GenerateInsightsNarrativeQueryHandler.BuildPrompt(SampleOverview());
        var canvaIdx = prompt.IndexOf("Canva", StringComparison.Ordinal);
        var acmeIdx = prompt.IndexOf("Acme", StringComparison.Ordinal);
        canvaIdx.Should().BeGreaterThan(0);
        acmeIdx.Should().BeGreaterThan(0);
        // The fact that Canva's line comes first means its IndexOf is
        // smaller — except [YOU] Acme might also appear earlier as
        // part of the rank list. Assert ordering by searching the
        // numeric rank prefixes instead.
        prompt.Should().Contain("1. Canva");
        prompt.Should().Contain("2. [YOU] Acme");
    }

    [Fact]
    public void BuildPrompt_HandlesEmptyRanking_Gracefully()
    {
        var empty = SampleOverview() with { TopEntities = Array.Empty<WorkspaceTopEntityRowDto>() };
        var prompt = GenerateInsightsNarrativeQueryHandler.BuildPrompt(empty);
        prompt.Should().Contain("no entities ranked yet");
    }

    [Fact]
    public void BuildPrompt_OmitsOptionalSections_WhenSignalsHaveNoData()
    {
        // Default SampleOverview() has empty arrays for every new
        // measurement-model field — none of the optional headers
        // should appear so the LLM isn't given "Top attributes: (none)"
        // and similar noise.
        var prompt = GenerateInsightsNarrativeQueryHandler.BuildPrompt(SampleOverview());

        prompt.Should().NotContain("Top attributes the AI ascribes");
        prompt.Should().NotContain("Risk flags raised");
        prompt.Should().NotContain("Head-to-head comparisons");
        prompt.Should().NotContain("Topic ownership");
        prompt.Should().NotContain("Competitor co-mentions");
        prompt.Should().NotContain("Recent factual claims");
    }

    [Fact]
    public void BuildPrompt_IncludesAbsenceAndFirstMentionRates_WhenPresent()
    {
        var dto = SampleOverview() with
        {
            Hero = SampleOverview().Hero with
            {
                BrandAbsenceRate = 0.4,
                BrandFirstMentionRate = 0.3,
            },
        };

        var prompt = GenerateInsightsNarrativeQueryHandler.BuildPrompt(dto);

        prompt.Should().Contain("Brand absence rate: 40%");
        prompt.Should().Contain("Brand first-mention rate: 30%");
    }

    [Fact]
    public void BuildPrompt_IncludesAttributes_WithPolarityAndCount()
    {
        var dto = SampleOverview() with
        {
            TopBrandAttributes = new[]
            {
                new WorkspaceBrandAttributeDto(1, "trustworthy", "Positive", 8),
                new WorkspaceBrandAttributeDto(2, "slow", "Negative", 3),
            },
        };

        var prompt = GenerateInsightsNarrativeQueryHandler.BuildPrompt(dto);

        prompt.Should().Contain("Top attributes the AI ascribes to your brand:");
        prompt.Should().Contain("\"trustworthy\" (Positive) — 8 mentions");
        prompt.Should().Contain("\"slow\" (Negative) — 3 mentions");
    }

    [Fact]
    public void BuildPrompt_IncludesRiskFlags_WithSeverity()
    {
        var dto = SampleOverview() with
        {
            TopBrandRiskFlags = new[]
            {
                new WorkspaceBrandRiskFlagDto(1, "layoffs", "High", 3),
                new WorkspaceBrandRiskFlagDto(2, "outage", "Low", 1),
            },
        };

        var prompt = GenerateInsightsNarrativeQueryHandler.BuildPrompt(dto);

        prompt.Should().Contain("Risk flags raised against your brand:");
        prompt.Should().Contain("layoffs (High) — 3 mentions");
        prompt.Should().Contain("outage (Low) — 1 mentions");
    }

    [Fact]
    public void BuildPrompt_IncludesHeadToHead_AndTopicOwnership_AndClaims()
    {
        var dto = SampleOverview() with
        {
            TopBrandComparisons = new[]
            {
                new WorkspaceBrandComparisonDto(1, "price", 4, 1),
                new WorkspaceBrandComparisonDto(2, "support_quality", 0, 3),
            },
            TopicOwnership = new[]
            {
                new WorkspaceTopicOwnershipDto(1, "Career advice", 10, 8),
                new WorkspaceTopicOwnershipDto(2, "Industry news", 6, 1),
            },
            RecentFactualClaims = new[]
            {
                new WorkspaceFactualClaimDto(
                    Guid.NewGuid(), Guid.NewGuid(), "Acme",
                    "founding_year", "1975",
                    "Acme was founded in 1975.", "evidence",
                    "Verifiable", "Disputed", DateTime.UtcNow),
            },
        };

        var prompt = GenerateInsightsNarrativeQueryHandler.BuildPrompt(dto);

        prompt.Should().Contain("Head-to-head comparisons (per aspect):");
        prompt.Should().Contain("price: 4 wins, 1 losses");
        prompt.Should().Contain("support_quality: 0 wins, 3 losses");

        prompt.Should().Contain("Topic ownership");
        prompt.Should().Contain("\"Career advice\": 8 / 10");
        prompt.Should().Contain("\"Industry news\": 1 / 6");

        prompt.Should().Contain("Recent factual claims");
        prompt.Should().Contain("[Disputed] founding_year = \"1975\" (Acme)");
    }
}
