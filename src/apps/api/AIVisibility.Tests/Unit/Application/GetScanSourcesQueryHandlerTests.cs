using AIVisibility.Application.Queries.Sources;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetScanSourcesQueryHandler tests. Seeds a scan with citations across
/// multiple sources + platforms and asserts the handler aggregates correctly:
/// citation counts, distinct platforms per source, classification join,
/// sort order, and graceful handling of missing classifications.
/// </summary>
public class GetScanSourcesQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid ScanRunId, Guid BrandId,
        Guid PlatformOpenAiId, Guid PlatformClaudeId,
        Guid SourceTrustpilotId, Guid SourceWikipediaId, Guid SourceOrphanId);

    private static Seed BuildScan(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "Lumina", WebsiteUrl = "https://lumina.io" };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand,
            Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var openai = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "OpenAI" };
        var claude = new AIPlatform { Id = Guid.NewGuid(), Code = "claude", Name = "Claude" };
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow,
        };
        var prompt = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id,
            PromptText = "p", LensId = Guid.NewGuid(),
            Status = PromptStatus.Active, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.AIPlatforms.Add(openai);
        ctx.AIPlatforms.Add(claude);
        ctx.ScanRuns.Add(scan);
        ctx.Prompts.Add(prompt);

        // Two prompt-runs: one OpenAI, one Claude. Each gets one AIAnswer.
        var runOpenAi = new PromptRun
        {
            Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id,
            AIPlatformId = openai.Id, Status = PromptRunStatus.Completed,
            StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow,
        };
        var runClaude = new PromptRun
        {
            Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id,
            AIPlatformId = claude.Id, Status = PromptRunStatus.Completed,
            StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow,
        };
        var answerOpenAi = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = runOpenAi.Id, AnswerText = "a", CreatedAt = DateTime.UtcNow };
        var answerClaude = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = runClaude.Id, AnswerText = "a", CreatedAt = DateTime.UtcNow };
        ctx.PromptRuns.Add(runOpenAi);
        ctx.PromptRuns.Add(runClaude);
        ctx.AIAnswers.Add(answerOpenAi);
        ctx.AIAnswers.Add(answerClaude);

        // Three sources:
        //   trustpilot — cited 3 times (OpenAI + OpenAI + Claude → 2 platforms)
        //   wikipedia  — cited 1 time  (Claude only)
        //   orphan     — cited 1 time, but has no BrandSourceClassification row
        var trustpilot = new Source { Id = Guid.NewGuid(), SourceName = "Trustpilot", NormalizedDomain = "trustpilot.com", CreatedAt = DateTime.UtcNow };
        var wikipedia = new Source { Id = Guid.NewGuid(), SourceName = "Wikipedia", NormalizedDomain = "en.wikipedia.org", CreatedAt = DateTime.UtcNow };
        var orphan = new Source { Id = Guid.NewGuid(), SourceName = "Orphan", CreatedAt = DateTime.UtcNow };
        ctx.Sources.Add(trustpilot);
        ctx.Sources.Add(wikipedia);
        ctx.Sources.Add(orphan);

        ctx.BrandSourceClassifications.Add(new BrandSourceClassification
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, SourceId = trustpilot.Id,
            SourceType = SourceType.ReviewSite, ConfidenceScore = 0.95,
            ProvenanceSource = ClassificationSource.LLMClassified,
            Status = ClassificationStatus.Active,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        ctx.BrandSourceClassifications.Add(new BrandSourceClassification
        {
            Id = Guid.NewGuid(), BrandId = brand.Id, SourceId = wikipedia.Id,
            SourceType = SourceType.Reference, ConfidenceScore = 0.9,
            ProvenanceSource = ClassificationSource.LLMClassified,
            Status = ClassificationStatus.Active,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        // orphan has NO classification row — handler must default to Unknown
        // rather than dropping or 500ing.

        void AddCitation(Guid answerId, Guid sourceId) => ctx.Citations.Add(new Citation
        {
            Id = Guid.NewGuid(), AIAnswerId = answerId, SourceId = sourceId,
            CitationType = CitationType.ExplicitUrl, CreatedAt = DateTime.UtcNow,
        });
        AddCitation(answerOpenAi.Id, trustpilot.Id);
        AddCitation(answerOpenAi.Id, trustpilot.Id);
        AddCitation(answerClaude.Id, trustpilot.Id);
        AddCitation(answerClaude.Id, wikipedia.Id);
        AddCitation(answerOpenAi.Id, orphan.Id);

        ctx.SaveChanges();
        return new Seed(scan.Id, brand.Id, openai.Id, claude.Id, trustpilot.Id, wikipedia.Id, orphan.Id);
    }

    [Fact]
    public async Task ReturnsNull_WhenScanDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetScanSourcesQueryHandler(ctx);

        var result = await sut.Handle(new GetScanSourcesQuery(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task AggregatesCitationsAndPlatforms_PerSource()
    {
        using var ctx = NewContext();
        var seed = BuildScan(ctx);
        var sut = new GetScanSourcesQueryHandler(ctx);

        var result = await sut.Handle(new GetScanSourcesQuery(seed.ScanRunId), CancellationToken.None);

        result.Should().NotBeNull();
        result!.ScanRunId.Should().Be(seed.ScanRunId);
        result.BrandId.Should().Be(seed.BrandId);
        result.Sources.Should().HaveCount(3);

        var trustpilot = result.Sources.Single(s => s.SourceId == seed.SourceTrustpilotId);
        trustpilot.SourceName.Should().Be("Trustpilot");
        trustpilot.NormalizedDomain.Should().Be("trustpilot.com");
        trustpilot.SourceType.Should().Be("ReviewSite");
        trustpilot.ProvenanceSource.Should().Be("LLMClassified");
        trustpilot.Status.Should().Be("Active");
        trustpilot.CitationCount.Should().Be(3);
        trustpilot.Platforms.Select(p => p.Code).Should().BeEquivalentTo(new[] { "openai", "claude" });

        var wikipedia = result.Sources.Single(s => s.SourceId == seed.SourceWikipediaId);
        wikipedia.CitationCount.Should().Be(1);
        wikipedia.Platforms.Should().ContainSingle(p => p.Code == "claude");
        wikipedia.SourceType.Should().Be("Reference");
    }

    [Fact]
    public async Task DefaultsToUnknown_WhenClassificationRowMissing()
    {
        // Defense-in-depth: if the persistence pipeline failed to create a
        // BrandSourceClassification for whatever reason, the handler must
        // still surface the source with Unknown classification rather than
        // dropping it from the list or 500ing.
        using var ctx = NewContext();
        var seed = BuildScan(ctx);
        var sut = new GetScanSourcesQueryHandler(ctx);

        var result = await sut.Handle(new GetScanSourcesQuery(seed.ScanRunId), CancellationToken.None);

        var orphan = result!.Sources.Single(s => s.SourceId == seed.SourceOrphanId);
        orphan.SourceType.Should().Be("Unknown");
        orphan.Status.Should().Be("Unknown");
        orphan.ProvenanceSource.Should().Be("RuleBased");
        orphan.CitationCount.Should().Be(1);
    }

    [Fact]
    public async Task Sorts_ByCitationCountDescThenName()
    {
        using var ctx = NewContext();
        var seed = BuildScan(ctx);
        var sut = new GetScanSourcesQueryHandler(ctx);

        var result = await sut.Handle(new GetScanSourcesQuery(seed.ScanRunId), CancellationToken.None);

        // Trustpilot (3) first, then Wikipedia (1) before Orphan (1) by name.
        result!.Sources.Select(s => s.SourceName).Should().ContainInOrder("Trustpilot", "Orphan", "Wikipedia");
    }

    [Fact]
    public async Task ReturnsEmpty_WhenScanHasNoCitations()
    {
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(scan);
        ctx.SaveChanges();

        var sut = new GetScanSourcesQueryHandler(ctx);
        var result = await sut.Handle(new GetScanSourcesQuery(scan.Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Sources.Should().BeEmpty();
    }
}
