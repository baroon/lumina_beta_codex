using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

/// <summary>
/// SignalExtractionJob tests. The job composes the real <c>SignalExtractor</c>
/// with a mocked <see cref="IOpenAiService"/> — that's the test seam per D8.
/// These tests cover the job-level concerns: context loading, parallel fanout,
/// per-answer failure isolation (D3), persistence, and the terminal Failed
/// path on job-level exceptions.
/// </summary>
public class SignalExtractionJobTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(Guid AnalysisJobId, Guid ScanRunId, List<Guid> AnswerIds);

    /// <summary>
    /// Seeds the full chain analysis depends on: Brand → TrackerConfiguration →
    /// ScanRun → PromptRun(s) → AIAnswer(s) → AnalysisJob.
    /// </summary>
    private static Seed SeedScan(AppDbContext ctx, int answerCount = 1, string brandName = "Lumina")
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = brandName,
            WebsiteUrl = "https://lumina.io",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Brand = brand,
            Name = "T",
            Status = TrackerStatus.Active,
            CreatedAt = DateTime.UtcNow,
        };
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            TrackerConfiguration = tracker,
            TriggerType = ScanTriggerType.Manual,
            Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        };
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "OpenAI" };
        var prompt = new Prompt
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            PromptText = "p",
            LensId = Guid.NewGuid(),
            Status = PromptStatus.Active,
            Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        ctx.Brands.Add(brand);
        ctx.TrackerConfigurations.Add(tracker);
        ctx.ScanRuns.Add(scan);
        ctx.AIPlatforms.Add(platform);
        ctx.Prompts.Add(prompt);

        var answerIds = new List<Guid>();
        for (var i = 0; i < answerCount; i++)
        {
            var promptRun = new PromptRun
            {
                Id = Guid.NewGuid(),
                ScanRunId = scan.Id,
                PromptId = prompt.Id,
                AIPlatformId = platform.Id,
                Status = PromptRunStatus.Completed,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow,
            };
            var answer = new AIAnswer
            {
                Id = Guid.NewGuid(),
                PromptRunId = promptRun.Id,
                AnswerText = $"Answer #{i}",
                CreatedAt = DateTime.UtcNow,
            };
            ctx.PromptRuns.Add(promptRun);
            ctx.AIAnswers.Add(answer);
            answerIds.Add(answer.Id);
        }

        var job = new AnalysisJob
        {
            Id = Guid.NewGuid(),
            ScanRunId = scan.Id,
            Status = AnalysisJobStatus.Queued,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.AnalysisJobs.Add(job);
        ctx.SaveChanges();
        return new Seed(job.Id, scan.Id, answerIds);
    }

    private static SignalExtractionJob Build(AppDbContext ctx, IOpenAiService openAi, int concurrency = 5)
    {
        var extractor = new SignalExtractor(openAi, new Mock<ILogger<SignalExtractor>>().Object);
        var options = Options.Create(new AnalysisOptions { ExtractionConcurrency = concurrency });
        // Phase 4 Slice 1: SignalExtractionJob now takes ISourceClassifier.
        // These tests focus on the per-answer extraction loop, not classification,
        // so the stub returns null (leaves rows at RuleBased) and is silent.
        var classifier = new Mock<ISourceClassifier>().Object;
        return new SignalExtractionJob(
            ctx, extractor, classifier, options, new Mock<ILogger<SignalExtractionJob>>().Object);
    }

    private const string MinimalEnvelope = """
        {
          "answer_signal": {
            "brand_mentioned": true, "brand_recommended": true,
            "brand_rank": 1, "brand_sentiment": "Positive",
            "brand_recommendation_strength": "Strong",
            "top_recommended_entity": "Lumina",
            "answer_has_ranking": true, "answer_has_comparison": false,
            "answer_has_citations": false, "confidence_score": 0.9
          },
          "mentions": [
            { "entity_type": "Brand", "name": "Lumina", "is_recommended": true,
              "recommendation_strength": "Strong", "sentiment": "Positive",
              "evidence_snippet": "Lumina is top.", "confidence_score": 0.95 }
          ],
          "citations": []
        }
        """;

    [Fact]
    public async Task Throws_WhenAnalysisJob_NotFound()
    {
        using var ctx = NewContext();
        var sut = Build(ctx, Mock.Of<IOpenAiService>());

        var act = () => sut.ExtractAsync(Guid.NewGuid(), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task ZeroAnswers_StampsTimestamps_NoPersistedRows()
    {
        using var ctx = NewContext();
        var seed = SeedScan(ctx, answerCount: 0);
        var sut = Build(ctx, Mock.Of<IOpenAiService>());

        await sut.ExtractAsync(seed.AnalysisJobId, CancellationToken.None);

        var job = await ctx.AnalysisJobs.FindAsync(seed.AnalysisJobId);
        job!.Status.Should().Be(AnalysisJobStatus.Running);
        job.ExtractStartedAt.Should().NotBeNull();
        job.ExtractCompletedAt.Should().NotBeNull();
        (await ctx.AnswerSignals.CountAsync()).Should().Be(0);
        (await ctx.Mentions.CountAsync()).Should().Be(0);
        (await ctx.Citations.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task HappyPath_PersistsSignalsAndMentionsForEachAnswer()
    {
        using var ctx = NewContext();
        var seed = SeedScan(ctx, answerCount: 3);

        var openAi = new Mock<IOpenAiService>();
        openAi
            .Setup(s => s.ChatCompletionAsync(It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(MinimalEnvelope);

        var sut = Build(ctx, openAi.Object);
        await sut.ExtractAsync(seed.AnalysisJobId, CancellationToken.None);

        (await ctx.AnswerSignals.CountAsync()).Should().Be(3);
        (await ctx.Mentions.CountAsync()).Should().Be(3);
        var job = await ctx.AnalysisJobs.FindAsync(seed.AnalysisJobId);
        job!.Status.Should().Be(AnalysisJobStatus.Running); // aggregate still skeleton
        job.ExtractCompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task PerAnswerFailure_IsIsolated_SiblingsStillPersist()
    {
        // D3 catch-and-continue: one bad LLM response should not fail the whole scan.
        // First answer gets a broken JSON response; the other two get valid envelopes.
        // Result: 2 signals + 2 mentions persisted, 0 candidates, job ends in Running
        // (the skeleton aggregate hasn't run yet to flip Completed).
        using var ctx = NewContext();
        var seed = SeedScan(ctx, answerCount: 3);

        var openAi = new Mock<IOpenAiService>();
        openAi
            .SetupSequence(s => s.ChatCompletionAsync(It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("not json")                    // answer 1 — extractor returns null
            .ReturnsAsync(MinimalEnvelope)                // answer 2
            .ReturnsAsync(MinimalEnvelope);               // answer 3

        // Concurrency=1 makes the SetupSequence ordering deterministic.
        var sut = Build(ctx, openAi.Object, concurrency: 1);
        await sut.ExtractAsync(seed.AnalysisJobId, CancellationToken.None);

        (await ctx.AnswerSignals.CountAsync()).Should().Be(2);
        (await ctx.Mentions.CountAsync()).Should().Be(2);
        var job = await ctx.AnalysisJobs.FindAsync(seed.AnalysisJobId);
        job!.Status.Should().Be(AnalysisJobStatus.Running);
        job.ExtractCompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task JobLevelException_MarksFailed_AndRethrows_ForHangfireRetry()
    {
        // Simulate a job-level failure: AnalysisJob exists, but the ScanRun row is
        // missing (FK violation would be the real-world case). The context-build
        // call throws; the job marks Status=Failed + ErrorMessage and rethrows so
        // Hangfire's [AutomaticRetry] can kick in (D3).
        using var ctx = NewContext();
        var orphanJob = new AnalysisJob
        {
            Id = Guid.NewGuid(),
            ScanRunId = Guid.NewGuid(),                  // points at nothing
            Status = AnalysisJobStatus.Queued,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.AnalysisJobs.Add(orphanJob);
        await ctx.SaveChangesAsync();

        var sut = Build(ctx, Mock.Of<IOpenAiService>());

        var act = () => sut.ExtractAsync(orphanJob.Id, CancellationToken.None);
        await act.Should().ThrowAsync<Exception>();

        var reloaded = await ctx.AnalysisJobs.FindAsync(orphanJob.Id);
        reloaded!.Status.Should().Be(AnalysisJobStatus.Failed);
        reloaded.ErrorMessage.Should().NotBeNullOrEmpty();
    }
}
