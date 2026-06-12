using AIVisibility.Application.Commands.FactualClaims;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Workspace ownership is the load-bearing invariant: the chain
/// claim → mention → answer → prompt → tracker → brand → workspace
/// is what gates access. The handler must reject a claim whose brand
/// belongs to a different workspace, and must allow Verified ↔ Pending
/// ↔ Disputed transitions in any direction.
/// </summary>
public class UpdateFactualClaimReviewStatusCommandHandlerTests
{
    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; }
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(Guid WorkspaceId, Guid OtherWorkspaceId, Guid ClaimId, Guid OtherClaimId);

    private static Seed Build(AppDbContext ctx, ClaimReviewStatus initial = ClaimReviewStatus.Pending)
    {
        var workspaceId = Guid.NewGuid();
        var otherWorkspaceId = Guid.NewGuid();
        var brand = new Brand
        {
            Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Acme",
            WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var otherBrand = new Brand
        {
            Id = Guid.NewGuid(), WorkspaceId = otherWorkspaceId, Name = "Foreign",
            WebsiteUrl = "https://foreign.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = brand.Id,
            Name = "Tracker", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var otherTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = otherBrand.Id,
            Name = "OtherTracker", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT", DisplayOrder = 1 };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "category-discovery", Name = "Category Discovery" };
        var prompt = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, PromptText = "p",
            LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var otherPrompt = new Prompt
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = otherTracker.Id, PromptText = "p",
            LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var scan = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow,
        };
        var otherScan = new ScanRun
        {
            Id = Guid.NewGuid(), TrackerConfigurationId = otherTracker.Id,
            TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
            StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow,
        };
        var promptRun = new PromptRun
        {
            Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id,
            AIPlatformId = platform.Id, Status = PromptRunStatus.Completed,
            StartedAt = DateTime.UtcNow,
        };
        var otherPromptRun = new PromptRun
        {
            Id = Guid.NewGuid(), ScanRunId = otherScan.Id, PromptId = otherPrompt.Id,
            AIPlatformId = platform.Id, Status = PromptRunStatus.Completed,
            StartedAt = DateTime.UtcNow,
        };
        var answer = new AIAnswer
        {
            Id = Guid.NewGuid(), PromptRunId = promptRun.Id,
            AnswerText = "a", CreatedAt = DateTime.UtcNow,
        };
        var otherAnswer = new AIAnswer
        {
            Id = Guid.NewGuid(), PromptRunId = otherPromptRun.Id,
            AnswerText = "a", CreatedAt = DateTime.UtcNow,
        };
        var mention = new Mention
        {
            Id = Guid.NewGuid(), AIAnswerId = answer.Id,
            EntityType = MentionEntityType.Brand, EntityId = brand.Id,
            NormalizedName = "Acme", EvidenceSnippet = "e",
            Sentiment = Sentiment.Positive, CreatedAt = DateTime.UtcNow,
        };
        var otherMention = new Mention
        {
            Id = Guid.NewGuid(), AIAnswerId = otherAnswer.Id,
            EntityType = MentionEntityType.Brand, EntityId = otherBrand.Id,
            NormalizedName = "Foreign", EvidenceSnippet = "e",
            Sentiment = Sentiment.Positive, CreatedAt = DateTime.UtcNow,
        };
        var claim = new FactualClaim
        {
            Id = Guid.NewGuid(), MentionId = mention.Id,
            ClaimText = "Acme was founded in 1975.",
            Subject = "founding_year", AssertedValue = "1975",
            EvidenceSnippet = "Acme was founded in 1975.",
            Verifiability = ClaimVerifiability.Verifiable,
            ReviewStatus = initial,
            ConfidenceScore = 0.9, CreatedAt = DateTime.UtcNow,
        };
        var otherClaim = new FactualClaim
        {
            Id = Guid.NewGuid(), MentionId = otherMention.Id,
            ClaimText = "Foreign founded in 2002.",
            Subject = "founding_year", AssertedValue = "2002",
            EvidenceSnippet = "Foreign founded in 2002.",
            Verifiability = ClaimVerifiability.Verifiable,
            ReviewStatus = ClaimReviewStatus.Pending,
            ConfidenceScore = 0.9, CreatedAt = DateTime.UtcNow,
        };
        ctx.Brands.AddRange(brand, otherBrand);
        ctx.TrackerConfigurations.AddRange(tracker, otherTracker);
        ctx.AIPlatforms.Add(platform);
        ctx.Lenses.Add(lens);
        ctx.Prompts.AddRange(prompt, otherPrompt);
        ctx.ScanRuns.AddRange(scan, otherScan);
        ctx.PromptRuns.AddRange(promptRun, otherPromptRun);
        ctx.AIAnswers.AddRange(answer, otherAnswer);
        ctx.Mentions.AddRange(mention, otherMention);
        ctx.FactualClaims.AddRange(claim, otherClaim);
        ctx.SaveChanges();
        return new Seed(workspaceId, otherWorkspaceId, claim.Id, otherClaim.Id);
    }

    [Fact]
    public async Task PersistsTheNewStatus_PendingToVerified()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var ws = new StubWorkspaceContext { WorkspaceId = seed.WorkspaceId };

        var result = await new UpdateFactualClaimReviewStatusCommandHandler(ctx, ws).Handle(
            new UpdateFactualClaimReviewStatusCommand(seed.ClaimId, ClaimReviewStatus.Verified),
            CancellationToken.None);

        result.ReviewStatus.Should().Be(ClaimReviewStatus.Verified);
        ctx.FactualClaims.Single(c => c.Id == seed.ClaimId).ReviewStatus
            .Should().Be(ClaimReviewStatus.Verified);
    }

    [Fact]
    public async Task AllowsTransitionFromVerifiedBackToPending()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initial: ClaimReviewStatus.Verified);
        var ws = new StubWorkspaceContext { WorkspaceId = seed.WorkspaceId };

        var result = await new UpdateFactualClaimReviewStatusCommandHandler(ctx, ws).Handle(
            new UpdateFactualClaimReviewStatusCommand(seed.ClaimId, ClaimReviewStatus.Pending),
            CancellationToken.None);

        result.ReviewStatus.Should().Be(ClaimReviewStatus.Pending);
    }

    [Fact]
    public async Task SettingSameStatus_IsANoOpButReturnsCurrent()
    {
        using var ctx = NewContext();
        var seed = Build(ctx, initial: ClaimReviewStatus.Disputed);
        var ws = new StubWorkspaceContext { WorkspaceId = seed.WorkspaceId };

        var result = await new UpdateFactualClaimReviewStatusCommandHandler(ctx, ws).Handle(
            new UpdateFactualClaimReviewStatusCommand(seed.ClaimId, ClaimReviewStatus.Disputed),
            CancellationToken.None);

        result.ReviewStatus.Should().Be(ClaimReviewStatus.Disputed);
    }

    [Fact]
    public async Task Throws_WhenClaimDoesNotExist()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var ws = new StubWorkspaceContext { WorkspaceId = seed.WorkspaceId };

        Func<Task> act = () => new UpdateFactualClaimReviewStatusCommandHandler(ctx, ws).Handle(
            new UpdateFactualClaimReviewStatusCommand(Guid.NewGuid(), ClaimReviewStatus.Verified),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_OnCrossWorkspaceOwnership()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        // Caller's workspace is the current one; the targeted claim
        // belongs to OtherWorkspaceId. Handler must refuse.
        var ws = new StubWorkspaceContext { WorkspaceId = seed.WorkspaceId };

        Func<Task> act = () => new UpdateFactualClaimReviewStatusCommandHandler(ctx, ws).Handle(
            new UpdateFactualClaimReviewStatusCommand(seed.OtherClaimId, ClaimReviewStatus.Verified),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*does not belong to the current workspace*");

        ctx.FactualClaims.Single(c => c.Id == seed.OtherClaimId).ReviewStatus
            .Should().Be(ClaimReviewStatus.Pending);
    }
}
