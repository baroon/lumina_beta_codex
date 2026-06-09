using AIVisibility.Application.Queries.Sources;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetScanSourceCitationsQueryHandler tests. The drawer drill-down — assert
/// that each citation surfaces with its prompt, platform, lens, URL, and a
/// snippet of the answer text (Phase 4 v1 plan §D15).
/// </summary>
public class GetScanSourceCitationsQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(Guid ScanRunId, Guid SourceId);

    private static Seed BuildScanWithOneSource(AppDbContext ctx)
    {
        var brand = new Brand { Id = Guid.NewGuid(), Name = "B" };
        var tracker = new TrackerConfiguration { Id = Guid.NewGuid(), BrandId = brand.Id, Brand = brand, Name = "T", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow };
        var scan = new ScanRun { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker, TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "OpenAI" };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "Discovery", Name = "Discovery Lens" };
        var prompt = new Prompt { Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, PromptText = "What are the best landscape architecture firms?", LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var run = new PromptRun { Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id, AIPlatformId = platform.Id, Status = PromptRunStatus.Completed, StartedAt = DateTime.UtcNow };
        var answer = new AIAnswer { Id = Guid.NewGuid(), PromptRunId = run.Id, AnswerText = new string('a', 800), CreatedAt = DateTime.UtcNow };
        var source = new Source { Id = Guid.NewGuid(), SourceName = "ASLA", NormalizedDomain = "asla.org", CreatedAt = DateTime.UtcNow };
        var sourceUrl = new SourceUrl { Id = Guid.NewGuid(), SourceId = source.Id, Url = "https://asla.org/page", NormalizedUrl = "https://asla.org/page", CreatedAt = DateTime.UtcNow };
        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.AIPlatforms.Add(platform);
        ctx.Lenses.Add(lens);
        ctx.Prompts.Add(prompt);
        ctx.ScanRuns.Add(scan);
        ctx.PromptRuns.Add(run);
        ctx.AIAnswers.Add(answer);
        ctx.Sources.Add(source);
        ctx.SourceUrls.Add(sourceUrl);

        ctx.Citations.Add(new Citation
        {
            Id = Guid.NewGuid(), AIAnswerId = answer.Id, SourceId = source.Id,
            SourceUrlId = sourceUrl.Id, CitationType = CitationType.ExplicitUrl,
            CreatedAt = DateTime.UtcNow,
        });

        ctx.SaveChanges();
        return new Seed(scan.Id, source.Id);
    }

    [Fact]
    public async Task ReturnsNull_WhenScanDoesNotExist()
    {
        using var ctx = NewContext();
        var sut = new GetScanSourceCitationsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanSourceCitationsQuery(Guid.NewGuid(), Guid.NewGuid()), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsNull_WhenSourceDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = BuildScanWithOneSource(ctx);
        var sut = new GetScanSourceCitationsQueryHandler(ctx);
        var result = await sut.Handle(new GetScanSourceCitationsQuery(seed.ScanRunId, Guid.NewGuid()), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsCitations_WithPromptPlatformLensAndUrl()
    {
        using var ctx = NewContext();
        var seed = BuildScanWithOneSource(ctx);
        var sut = new GetScanSourceCitationsQueryHandler(ctx);

        var result = await sut.Handle(
            new GetScanSourceCitationsQuery(seed.ScanRunId, seed.SourceId),
            CancellationToken.None);

        result.Should().NotBeNull();
        result!.SourceName.Should().Be("ASLA");
        result.Domain.Should().Be("asla.org");
        result.Citations.Should().ContainSingle();

        var citation = result.Citations[0];
        citation.CitationType.Should().Be("ExplicitUrl");
        citation.Url.Should().Be("https://asla.org/page");
        citation.PromptText.Should().Contain("landscape architecture");
        citation.PlatformCode.Should().Be("openai");
        citation.PlatformName.Should().Be("OpenAI");
        citation.LensName.Should().Be("Discovery Lens");
    }

    [Fact]
    public async Task TruncatesAnswerSnippet_ToBoundedLength()
    {
        // 800-char seed answer; handler truncates to 400 + "…" so the drawer
        // stays a quick render.
        using var ctx = NewContext();
        var seed = BuildScanWithOneSource(ctx);
        var sut = new GetScanSourceCitationsQueryHandler(ctx);

        var result = await sut.Handle(
            new GetScanSourceCitationsQuery(seed.ScanRunId, seed.SourceId),
            CancellationToken.None);

        var snippet = result!.Citations[0].AnswerSnippet;
        snippet.Length.Should().BeLessThanOrEqualTo(401); // 400 chars + ellipsis
        snippet.Should().EndWith("…");
    }

    [Fact]
    public async Task ReturnsEmptyList_WhenSourceHasNoCitationsInThisScan()
    {
        // Source exists but no citation joins it to a prompt-run in this scan.
        using var ctx = NewContext();
        var seed = BuildScanWithOneSource(ctx);
        // Add an unrelated source with no citations.
        var unrelated = new Source { Id = Guid.NewGuid(), SourceName = "Unrelated", CreatedAt = DateTime.UtcNow };
        ctx.Sources.Add(unrelated);
        ctx.SaveChanges();

        var sut = new GetScanSourceCitationsQueryHandler(ctx);
        var result = await sut.Handle(
            new GetScanSourceCitationsQuery(seed.ScanRunId, unrelated.Id),
            CancellationToken.None);

        result.Should().NotBeNull();
        result!.SourceName.Should().Be("Unrelated");
        result.Citations.Should().BeEmpty();
    }
}
