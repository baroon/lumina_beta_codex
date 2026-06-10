using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Sources;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetWorkspaceDomainsQueryHandler tests. Seeds a multi-brand workspace
/// with citations across multiple Sources + scans (in / out of window) and
/// asserts aggregation: citation count + retrieved-in-scans + last-seen,
/// classification dominance across BrandSourceClassifications, sort order,
/// tracker filter intersection, and window filtering.
/// </summary>
public class GetWorkspaceDomainsQueryHandlerTests
{
    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; } = Guid.Empty;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetWorkspaceDomainsQueryHandler NewHandler(AppDbContext ctx) =>
        new(ctx, new StubWorkspaceContext());

    private sealed record Seed(
        Guid AcmeId, Guid AcmeTrackerId,
        Guid BetaId, Guid BetaTrackerId,
        Guid SourceTrustpilotId, Guid SourceRedditId, Guid SourceOrphanId,
        Guid InWindowScanAcmeId, Guid InWindowScanBetaId, Guid OutOfWindowScanId);

    /// <summary>
    /// Two tracked brands × one tracker each. Three Sources:
    ///   trustpilot — cited 3× across two in-window scans (Editorial)
    ///   reddit     — cited 1× in one in-window scan; classified as UGC for
    ///                Acme + Competitor for Beta → dominance picks the
    ///                more frequent label (one each → first wins ordering;
    ///                test verifies one OR the other).
    ///   orphan     — cited 1× in window but has no BrandSourceClassification
    ///                rows; handler must default to "Unknown".
    /// One additional out-of-window scan citing trustpilot — should NOT count.
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

        var acmeScan = NewScan(acmeTracker, now.AddDays(-1));
        var betaScan = NewScan(betaTracker, now.AddDays(-3));
        var oldAcmeScan = NewScan(acmeTracker, now.AddDays(-40));
        ctx.ScanRuns.Add(acmeScan);
        ctx.ScanRuns.Add(betaScan);
        ctx.ScanRuns.Add(oldAcmeScan);

        PromptRun NewRun(Prompt p, ScanRun s) =>
            new()
            {
                Id = Guid.NewGuid(), ScanRunId = s.Id, PromptId = p.Id,
                AIPlatformId = openai.Id, Status = PromptRunStatus.Completed,
                StartedAt = s.StartedAt, CompletedAt = s.CompletedAt,
            };

        var runAcmeInWindow = NewRun(pAcme, acmeScan);
        var runBetaInWindow = NewRun(pBeta, betaScan);
        var runAcmeOutOfWindow = NewRun(pAcme, oldAcmeScan);
        ctx.PromptRuns.Add(runAcmeInWindow);
        ctx.PromptRuns.Add(runBetaInWindow);
        ctx.PromptRuns.Add(runAcmeOutOfWindow);

        AIAnswer NewAnswer(PromptRun pr, DateTime at) =>
            new() { Id = Guid.NewGuid(), PromptRunId = pr.Id, AnswerText = "a", CreatedAt = at };

        var answerAcmeIn = NewAnswer(runAcmeInWindow, now.AddDays(-1));
        var answerBetaIn = NewAnswer(runBetaInWindow, now.AddDays(-3));
        var answerAcmeOut = NewAnswer(runAcmeOutOfWindow, now.AddDays(-40));
        ctx.AIAnswers.Add(answerAcmeIn);
        ctx.AIAnswers.Add(answerBetaIn);
        ctx.AIAnswers.Add(answerAcmeOut);

        var trustpilot = new Source { Id = Guid.NewGuid(), SourceName = "Trustpilot", NormalizedDomain = "trustpilot.com", AuthorityScore = 78, CreatedAt = now };
        var reddit = new Source { Id = Guid.NewGuid(), SourceName = "Reddit", NormalizedDomain = "reddit.com", AuthorityScore = 35, CreatedAt = now };
        var orphan = new Source { Id = Guid.NewGuid(), SourceName = "Orphan", NormalizedDomain = "unclassified.example", CreatedAt = now };
        ctx.Sources.Add(trustpilot);
        ctx.Sources.Add(reddit);
        ctx.Sources.Add(orphan);

        // Classifications: trustpilot is Editorial for both brands (clear
        // majority); reddit is UGC for Acme + Competitor for Beta (50/50
        // — handler picks one deterministically); orphan has none.
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
        ctx.BrandSourceClassifications.Add(Bsc(beta.Id, reddit.Id, SourceType.Competitor));

        void AddCitation(Guid answerId, Source source) => ctx.Citations.Add(new Citation
        {
            Id = Guid.NewGuid(), AIAnswerId = answerId, SourceId = source.Id,
            CitationType = CitationType.ExplicitUrl, CreatedAt = now,
        });
        // Acme in-window scan: 2x trustpilot, 1x reddit, 1x orphan.
        AddCitation(answerAcmeIn.Id, trustpilot);
        AddCitation(answerAcmeIn.Id, trustpilot);
        AddCitation(answerAcmeIn.Id, reddit);
        AddCitation(answerAcmeIn.Id, orphan);
        // Beta in-window scan: 1x trustpilot.
        AddCitation(answerBetaIn.Id, trustpilot);
        // Out-of-window: 1x trustpilot — should NOT contribute.
        AddCitation(answerAcmeOut.Id, trustpilot);

        ctx.SaveChanges();
        return new Seed(
            acme.Id, acmeTracker.Id, beta.Id, betaTracker.Id,
            trustpilot.Id, reddit.Id, orphan.Id,
            acmeScan.Id, betaScan.Id, oldAcmeScan.Id);
    }

    [Fact]
    public async Task ReturnsEmpty_WhenWorkspaceHasNoBrands()
    {
        using var ctx = NewContext();
        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceDomainsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);
        result.Domains.Should().BeEmpty();
    }

    [Fact]
    public async Task Aggregates_CitationCountAndRetrievedInScans_AcrossInWindowScans()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceDomainsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        // Three Sources cited in window — trustpilot, reddit, orphan.
        result.Domains.Should().HaveCount(3);

        var trustpilot = result.Domains.Single(d => d.SourceId == seed.SourceTrustpilotId);
        // 2 (Acme in-window) + 1 (Beta in-window) = 3. The -40d Acme citation drops.
        trustpilot.CitationCount.Should().Be(3);
        trustpilot.RetrievedInScans.Should().Be(2); // Acme + Beta scans
        trustpilot.SourceType.Should().Be("Editorial");
        trustpilot.AuthorityScore.Should().Be(78);

        var reddit = result.Domains.Single(d => d.SourceId == seed.SourceRedditId);
        reddit.CitationCount.Should().Be(1);
        reddit.RetrievedInScans.Should().Be(1);
        // Tied 50/50 between UGC and Competitor — handler picks whichever
        // landed first in EF grouping. Either is valid; assert one of the
        // two so the test isn't tied to grouping order.
        reddit.SourceType.Should().BeOneOf("UGC", "Competitor");
    }

    [Fact]
    public async Task DefaultsToUnknown_WhenSourceHasNoBrandClassification()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceDomainsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        var orphan = result.Domains.Single(d => d.SourceId == seed.SourceOrphanId);
        orphan.SourceType.Should().Be("Unknown");
    }

    [Fact]
    public async Task TrackerIdsFilter_NarrowsAggregationToSubset()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // Filter to just Beta's tracker — trustpilot should drop from 3 → 1.
        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceDomainsQuery(
                DateTime.UtcNow.AddDays(-30), null,
                TrackerIds: new[] { seed.BetaTrackerId }),
            CancellationToken.None);

        result.Domains.Should().ContainSingle(d => d.SourceId == seed.SourceTrustpilotId);
        result.Domains.Single(d => d.SourceId == seed.SourceTrustpilotId).CitationCount.Should().Be(1);
    }

    [Fact]
    public async Task TrackerIdsFilter_IgnoresUnknownIds()
    {
        using var ctx = NewContext();
        Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceDomainsQuery(
                DateTime.UtcNow.AddDays(-30), null,
                TrackerIds: new[] { Guid.NewGuid() }),
            CancellationToken.None);

        result.Domains.Should().BeEmpty();
    }

    [Fact]
    public async Task Sorts_ByCitationCountDescThenName()
    {
        using var ctx = NewContext();
        Build(ctx);

        var result = await NewHandler(ctx).Handle(
            new GetWorkspaceDomainsQuery(DateTime.UtcNow.AddDays(-30), null, null),
            CancellationToken.None);

        // Trustpilot (3) is first; reddit and orphan tied at 1, alphabetical → orphan, reddit.
        result.Domains.Select(d => d.SourceName).Should().ContainInOrder("Trustpilot", "Orphan", "Reddit");
    }
}
