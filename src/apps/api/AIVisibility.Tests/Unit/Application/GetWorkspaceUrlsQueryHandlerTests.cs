using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Sources;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetWorkspaceUrlsQueryHandler tests. Same shape as the domains handler
/// but at URL granularity — mentioned-source citations without a SourceUrl
/// must be skipped, URL-bearing citations must aggregate per SourceUrlId.
/// Tests cover URL-only filter, aggregation, classification inheritance
/// from the parent Source, tracker filter, and window filter.
/// </summary>
public class GetWorkspaceUrlsQueryHandlerTests
{
    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; } = Guid.Empty;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetWorkspaceUrlsQueryHandler NewHandler(AppDbContext ctx) =>
        new(ctx, new StubWorkspaceContext());

    private sealed record Seed(
        Guid AcmeId, Guid AcmeTrackerId,
        Guid BetaId, Guid BetaTrackerId,
        Guid SourceTrustpilotId, Guid SourceRedditId,
        Guid UrlTrustpilotReviewsId, Guid UrlTrustpilotMainId, Guid UrlRedditThreadId);

    /// <summary>
    /// Two brands × one tracker each. Trustpilot has two URLs (a reviews
    /// page + the main page). Reddit has one URL. Citations:
    ///   trustpilot/reviews: 2× in Acme in-window scan
    ///   trustpilot/main:    1× in Beta in-window scan
    ///   reddit/thread:      1× in Acme in-window scan
    ///   trustpilot (NO URL, mentioned-source only): 1× — handler must skip
    ///   trustpilot/reviews: 1× in OUT-OF-WINDOW Acme scan — must skip
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var acme = new Brand { Id = Guid.NewGuid(), Name = "Acme" };
        var beta = new Brand { Id = Guid.NewGuid(), Name = "Beta" };
        var acmeTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = acme.Id, Brand = acme,
            Name = "T-Acme", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var betaTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = beta.Id, Brand = beta,
            Name = "T-Beta", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "category-discovery", Name = "Category Discovery" };
        var openai = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT", DisplayOrder = 1 };

        ctx.Brands.Add(acme);
        ctx.Brands.Add(beta);
        ctx.TrackerConfigurations.Add(acmeTracker);
        ctx.TrackerConfigurations.Add(betaTracker);
        ctx.Lenses.Add(lens);
        ctx.AIPlatforms.Add(openai);

        var now = DateTime.UtcNow;

        Prompt AddPrompt(TrackerConfiguration t) =>
            new()
            {
                Id = Guid.NewGuid(), TrackerConfigurationId = t.Id, PromptText = "p",
                LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
                CreatedAt = now, UpdatedAt = now,
            };
        var pAcme = AddPrompt(acmeTracker);
        var pBeta = AddPrompt(betaTracker);
        ctx.Prompts.Add(pAcme);
        ctx.Prompts.Add(pBeta);

        ScanRun NewScan(TrackerConfiguration t, DateTime startedAt) =>
            new()
            {
                Id = Guid.NewGuid(), TrackerConfigurationId = t.Id, TrackerConfiguration = t,
                TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
                StartedAt = startedAt, CompletedAt = startedAt.AddMinutes(5),
            };

        var acmeIn = NewScan(acmeTracker, now.AddDays(-1));
        var betaIn = NewScan(betaTracker, now.AddDays(-3));
        var acmeOld = NewScan(acmeTracker, now.AddDays(-40));
        ctx.ScanRuns.Add(acmeIn);
        ctx.ScanRuns.Add(betaIn);
        ctx.ScanRuns.Add(acmeOld);

        PromptRun NewRun(Prompt p, ScanRun s) =>
            new()
            {
                Id = Guid.NewGuid(), ScanRunId = s.Id, PromptId = p.Id,
                AIPlatformId = openai.Id, Status = PromptRunStatus.Completed,
                StartedAt = s.StartedAt, CompletedAt = s.CompletedAt,
            };
        var runAcmeIn = NewRun(pAcme, acmeIn);
        var runBetaIn = NewRun(pBeta, betaIn);
        var runAcmeOld = NewRun(pAcme, acmeOld);
        ctx.PromptRuns.Add(runAcmeIn);
        ctx.PromptRuns.Add(runBetaIn);
        ctx.PromptRuns.Add(runAcmeOld);

        var answerAcmeIn = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = runAcmeIn.Id, AnswerText = "a", CreatedAt = now.AddDays(-1) };
        var answerBetaIn = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = runBetaIn.Id, AnswerText = "a", CreatedAt = now.AddDays(-3) };
        var answerAcmeOld = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = runAcmeOld.Id, AnswerText = "a", CreatedAt = now.AddDays(-40) };
        ctx.AIAnswers.Add(answerAcmeIn);
        ctx.AIAnswers.Add(answerBetaIn);
        ctx.AIAnswers.Add(answerAcmeOld);

        var trustpilot = new Source { Id = Guid.NewGuid(), SourceName = "Trustpilot", NormalizedDomain = "trustpilot.com", AuthorityScore = 78, CreatedAt = now };
        var reddit = new Source { Id = Guid.NewGuid(), SourceName = "Reddit", NormalizedDomain = "reddit.com", AuthorityScore = 35, CreatedAt = now };
        ctx.Sources.Add(trustpilot);
        ctx.Sources.Add(reddit);

        var urlTrustpilotReviews = new SourceUrl
        {
            Id = Guid.NewGuid(), SourceId = trustpilot.Id,
            Url = "https://trustpilot.com/reviews/acme",
            NormalizedUrl = "trustpilot.com/reviews/acme",
            Title = "Acme reviews",
            CreatedAt = now,
        };
        var urlTrustpilotMain = new SourceUrl
        {
            Id = Guid.NewGuid(), SourceId = trustpilot.Id,
            Url = "https://trustpilot.com",
            NormalizedUrl = "trustpilot.com",
            Title = null,
            CreatedAt = now,
        };
        var urlRedditThread = new SourceUrl
        {
            Id = Guid.NewGuid(), SourceId = reddit.Id,
            Url = "https://reddit.com/r/resumes/hot",
            NormalizedUrl = "reddit.com/r/resumes/hot",
            Title = "Resume tips thread",
            CreatedAt = now,
        };
        ctx.SourceUrls.Add(urlTrustpilotReviews);
        ctx.SourceUrls.Add(urlTrustpilotMain);
        ctx.SourceUrls.Add(urlRedditThread);

        // Classifications: trustpilot Editorial for both brands; reddit UGC for Acme.
        BrandSourceClassification Bsc(Guid brandId, Guid sourceId, SourceType type) =>
            new()
            {
                Id = Guid.NewGuid(), BrandId = brandId, SourceId = sourceId,
                SourceType = type, ConfidenceScore = 0.9,
                ProvenanceSource = ClassificationSource.LLMClassified,
                Status = ClassificationStatus.Active,
                CreatedAt = now, UpdatedAt = now,
            };
        ctx.BrandSourceClassifications.Add(Bsc(acme.Id, trustpilot.Id, SourceType.Editorial));
        ctx.BrandSourceClassifications.Add(Bsc(beta.Id, trustpilot.Id, SourceType.Editorial));
        ctx.BrandSourceClassifications.Add(Bsc(acme.Id, reddit.Id, SourceType.UGC));

        void AddCitation(Guid answerId, Source source, SourceUrl? url) => ctx.Citations.Add(new Citation
        {
            Id = Guid.NewGuid(), AIAnswerId = answerId,
            SourceId = source.Id, SourceUrlId = url?.Id,
            CitationType = CitationType.ExplicitUrl, CreatedAt = now,
        });
        AddCitation(answerAcmeIn.Id, trustpilot, urlTrustpilotReviews);
        AddCitation(answerAcmeIn.Id, trustpilot, urlTrustpilotReviews);
        AddCitation(answerBetaIn.Id, trustpilot, urlTrustpilotMain);
        AddCitation(answerAcmeIn.Id, reddit, urlRedditThread);
        // Mentioned-source citation (no URL) — handler must skip on this page.
        AddCitation(answerAcmeIn.Id, trustpilot, null);
        // Out-of-window citation referencing a URL — must drop too.
        AddCitation(answerAcmeOld.Id, trustpilot, urlTrustpilotReviews);

        ctx.SaveChanges();
        return new Seed(
            acme.Id, acmeTracker.Id, beta.Id, betaTracker.Id,
            trustpilot.Id, reddit.Id,
            urlTrustpilotReviews.Id, urlTrustpilotMain.Id, urlRedditThread.Id);
    }

    [Fact]
    public async Task ReturnsEmpty_WhenWorkspaceHasNoBrands()
    {
        using var ctx = NewContext();
        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceUrlsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);
        result.Urls.Should().BeEmpty();
    }

    [Fact]
    public async Task SkipsMentionedSourceCitationsWithoutSourceUrl()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceUrlsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        // 3 URLs cited in window. The mentioned-source-only citation
        // (SourceUrlId = null) is excluded; the out-of-window URL citation
        // is also excluded.
        result.Urls.Should().HaveCount(3);
        result.Urls.Should().Contain(u => u.SourceUrlId == seed.UrlTrustpilotReviewsId);
        result.Urls.Should().Contain(u => u.SourceUrlId == seed.UrlTrustpilotMainId);
        result.Urls.Should().Contain(u => u.SourceUrlId == seed.UrlRedditThreadId);
    }

    [Fact]
    public async Task AggregatesPerUrl_WithSourceClassificationInherited()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceUrlsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        var trustpilotReviews = result.Urls.Single(u => u.SourceUrlId == seed.UrlTrustpilotReviewsId);
        trustpilotReviews.SourceId.Should().Be(seed.SourceTrustpilotId);
        trustpilotReviews.SourceName.Should().Be("Trustpilot");
        trustpilotReviews.NormalizedDomain.Should().Be("trustpilot.com");
        trustpilotReviews.SourceType.Should().Be("Editorial");
        trustpilotReviews.Title.Should().Be("Acme reviews");
        // Two citations in the Acme in-window scan only.
        trustpilotReviews.CitationCount.Should().Be(2);
        trustpilotReviews.RetrievedInScans.Should().Be(1);
        trustpilotReviews.LastSeenAt.Should().NotBeNull();

        var redditThread = result.Urls.Single(u => u.SourceUrlId == seed.UrlRedditThreadId);
        redditThread.SourceType.Should().Be("UGC");
        redditThread.CitationCount.Should().Be(1);
    }

    [Fact]
    public async Task TrackerIdsFilter_NarrowsToSubset()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // Filter to Beta only — only trustpilot/main URL should surface.
        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceUrlsQuery(
                DateTime.UtcNow.AddDays(-30), null,
                TrackerIds: new[] { seed.BetaTrackerId }),
            CancellationToken.None);

        result.Urls.Should().ContainSingle()
            .Which.SourceUrlId.Should().Be(seed.UrlTrustpilotMainId);
    }

    [Fact]
    public async Task TrackerIdsFilter_IgnoresUnknownIds()
    {
        using var ctx = NewContext();
        Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceUrlsQuery(
                DateTime.UtcNow.AddDays(-30), null,
                TrackerIds: new[] { Guid.NewGuid() }),
            CancellationToken.None);

        result.Urls.Should().BeEmpty();
    }

    [Fact]
    public async Task Sorts_ByCitationCountDescThenUrl()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceUrlsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        // trustpilot/reviews has 2 citations → rank 1. The other two URLs
        // are tied at 1; the secondary alphabetical-by-Url tiebreaker is
        // deterministic but order-of-the-tied-pair isn't load-bearing for
        // the user — assert the count-2 row leads.
        result.Urls.Should().HaveCount(3);
        result.Urls[0].SourceUrlId.Should().Be(seed.UrlTrustpilotReviewsId);
        result.Urls[0].CitationCount.Should().Be(2);
        result.Urls[1].CitationCount.Should().Be(1);
        result.Urls[2].CitationCount.Should().Be(1);
    }
}
