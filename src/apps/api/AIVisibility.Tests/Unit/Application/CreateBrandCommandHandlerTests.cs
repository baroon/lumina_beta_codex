using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AIVisibility.Tests.Unit.Application;

public class CreateBrandCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Handle_ShouldCreateBrandAndDiscoveryRun()
    {
        using var ctx = NewContext();
        var jobClient = new Mock<IBackgroundJobClient>();
        var handler = new CreateBrandCommandHandler(ctx, jobClient.Object);
        var command = new CreateBrandCommand("Test Brand", "https://example.com", Guid.NewGuid());

        var result = await handler.Handle(command, CancellationToken.None);

        result.BrandId.Should().NotBeEmpty();
        result.DiscoveryRunId.Should().NotBeEmpty();
        ctx.Brands.Should().ContainSingle(b => b.Id == result.BrandId && b.Name == "Test Brand");
        ctx.DiscoveryRuns.Should().ContainSingle(r => r.Id == result.DiscoveryRunId && r.BrandId == result.BrandId);
    }

    [Fact]
    public async Task Handle_ShouldEnqueueHangfireJob()
    {
        using var ctx = NewContext();
        var jobClient = new Mock<IBackgroundJobClient>();
        var handler = new CreateBrandCommandHandler(ctx, jobClient.Object);
        var command = new CreateBrandCommand("Test Brand", "https://example.com", Guid.NewGuid());

        await handler.Handle(command, CancellationToken.None);

        jobClient.Verify(x => x.Create(It.IsAny<Job>(), It.IsAny<IState>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ReusesExistingBrand_WhenSameWorkspaceAndCaseInsensitiveNameMatch()
    {
        // The case-insensitive unique index in the DB would otherwise reject a
        // second "nostri" against "Nostri" — the handler upserts so the user-
        // facing flow returns the existing brand's id and still enqueues a
        // fresh discovery run.
        using var ctx = NewContext();
        var workspaceId = Guid.NewGuid();
        var existing = new Brand
        {
            Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Nostri",
            WebsiteUrl = "https://nostri.example", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(existing);
        await ctx.SaveChangesAsync();

        var jobClient = new Mock<IBackgroundJobClient>();
        var handler = new CreateBrandCommandHandler(ctx, jobClient.Object);
        var result = await handler.Handle(
            new CreateBrandCommand("nostri", "https://nostri.example", workspaceId),
            CancellationToken.None);

        result.BrandId.Should().Be(existing.Id);
        ctx.Brands.Should().ContainSingle(b => b.WorkspaceId == workspaceId);
        ctx.DiscoveryRuns.Should().ContainSingle(r => r.BrandId == existing.Id);
        jobClient.Verify(x => x.Create(It.IsAny<Job>(), It.IsAny<IState>()), Times.Once);
    }

    [Fact]
    public async Task Handle_CreatesSeparateBrands_WhenSameNameInDifferentWorkspaces()
    {
        // Defense-in-depth check that the case-insensitive lookup is workspace-
        // scoped — two different workspaces can both have a "Nostri" brand.
        using var ctx = NewContext();
        var existing = new Brand
        {
            Id = Guid.NewGuid(), WorkspaceId = Guid.NewGuid(), Name = "Nostri",
            WebsiteUrl = "https://nostri.example", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(existing);
        await ctx.SaveChangesAsync();

        var jobClient = new Mock<IBackgroundJobClient>();
        var handler = new CreateBrandCommandHandler(ctx, jobClient.Object);
        var result = await handler.Handle(
            new CreateBrandCommand("Nostri", "https://nostri.example", Guid.NewGuid()),
            CancellationToken.None);

        result.BrandId.Should().NotBe(existing.Id);
        ctx.Brands.Should().HaveCount(2);
    }
}
