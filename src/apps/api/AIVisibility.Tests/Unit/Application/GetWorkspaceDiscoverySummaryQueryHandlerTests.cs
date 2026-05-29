using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Entities;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetWorkspaceDiscoverySummaryQueryHandler tests. The strip rolls up
/// per-brand / per-DiscoveryRun rows to a workspace-wide deduplicated
/// list — duplicates are common when a workspace has multiple brands or
/// a brand was discovered repeatedly. Dedup is name-only,
/// case-insensitive.
/// </summary>
public class GetWorkspaceDiscoverySummaryQueryHandlerTests
{
    private static readonly Guid TargetWorkspace = Guid.NewGuid();

    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; } = TargetWorkspace;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetWorkspaceDiscoverySummaryQueryHandler NewHandler(AppDbContext ctx) =>
        new(ctx, new StubWorkspaceContext());

    /// <summary>
    /// Three brands in the workspace. Brand A + Brand B each declare a
    /// "United States" market (same name, different rows). Brand A
    /// declares a "Resume Builder" product, Brand C declares the same
    /// product with a typo "resume builder" (different case). One brand
    /// outside the workspace adds "Outside" rows that must NOT appear.
    /// </summary>
    [Fact]
    public async Task DedupsByName_AcrossBrands_AndScopesToTheWorkspace()
    {
        using var ctx = NewContext();

        var inA = new Brand { Id = Guid.NewGuid(), WorkspaceId = TargetWorkspace, Name = "In-A" };
        var inB = new Brand { Id = Guid.NewGuid(), WorkspaceId = TargetWorkspace, Name = "In-B" };
        var inC = new Brand { Id = Guid.NewGuid(), WorkspaceId = TargetWorkspace, Name = "In-C" };
        var outside = new Brand { Id = Guid.NewGuid(), WorkspaceId = Guid.NewGuid(), Name = "Outside" };
        var run = Guid.NewGuid();
        ctx.Brands.AddRange(inA, inB, inC, outside);

        ctx.Markets.Add(new Market { Id = Guid.NewGuid(), BrandId = inA.Id, Name = "United States", DiscoveryRunId = run });
        ctx.Markets.Add(new Market { Id = Guid.NewGuid(), BrandId = inB.Id, Name = "United States", DiscoveryRunId = run });
        ctx.Markets.Add(new Market { Id = Guid.NewGuid(), BrandId = inC.Id, Name = "United Kingdom", DiscoveryRunId = run });
        ctx.Markets.Add(new Market { Id = Guid.NewGuid(), BrandId = outside.Id, Name = "Should not appear", DiscoveryRunId = run });

        ctx.Products.Add(new Product { Id = Guid.NewGuid(), BrandId = inA.Id, Name = "Resume Builder", DiscoveryRunId = run });
        ctx.Products.Add(new Product { Id = Guid.NewGuid(), BrandId = inC.Id, Name = "resume builder", DiscoveryRunId = run });
        ctx.Products.Add(new Product { Id = Guid.NewGuid(), BrandId = inB.Id, Name = "Job Board", DiscoveryRunId = run });

        ctx.Audiences.Add(new Audience { Id = Guid.NewGuid(), BrandId = inA.Id, Name = "Job seekers", DiscoveryRunId = run });

        ctx.Topics.Add(new Topic { Id = Guid.NewGuid(), BrandId = inB.Id, Name = "Salary trends", DiscoveryRunId = run });
        ctx.Topics.Add(new Topic { Id = Guid.NewGuid(), BrandId = inC.Id, Name = "Salary trends", DiscoveryRunId = run });

        await ctx.SaveChangesAsync();

        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceDiscoverySummaryQuery(), CancellationToken.None);

        result.Markets.Select(m => m.Name).Should().BeEquivalentTo(
            new[] { "United Kingdom", "United States" }, o => o.WithStrictOrdering());
        result.Products.Select(p => p.Name).Should().BeEquivalentTo(
            new[] { "Job Board", "Resume Builder" }, o => o.WithStrictOrdering());
        result.Audiences.Select(a => a.Name).Should().BeEquivalentTo(new[] { "Job seekers" });
        result.Topics.Select(t => t.Name).Should().BeEquivalentTo(new[] { "Salary trends" });
        result.TrustSignals.Should().BeEmpty();
    }

    [Fact]
    public async Task ReturnsAllEmpty_WhenWorkspaceHasNoBrands()
    {
        using var ctx = NewContext();
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceDiscoverySummaryQuery(), CancellationToken.None);

        result.Products.Should().BeEmpty();
        result.Markets.Should().BeEmpty();
        result.Audiences.Should().BeEmpty();
        result.Topics.Should().BeEmpty();
        result.TrustSignals.Should().BeEmpty();
    }
}
