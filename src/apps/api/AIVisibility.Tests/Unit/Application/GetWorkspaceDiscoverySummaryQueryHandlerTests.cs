using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Entities;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetWorkspaceDiscoverySummaryQueryHandler tests. The handler returns
/// per-brand grouped dimensions (one section per brand that has any
/// rows for that dimension); within a brand, items are deduplicated by
/// name (case-insensitive); across brands, identical names live in
/// each brand's own group so the tracker dropdown can show context.
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
    /// "United States" market — both rows must appear under their
    /// respective brand sections (no cross-brand dedup). Brand A
    /// declares "Resume Builder" twice (different DiscoveryRun rows) —
    /// must collapse to a single row under Brand A. One brand outside
    /// the workspace adds rows that must NOT appear at all.
    /// </summary>
    [Fact]
    public async Task GroupsByBrand_DedupsWithinBrand_AndScopesToWorkspace()
    {
        using var ctx = NewContext();

        var inA = new Brand { Id = Guid.NewGuid(), WorkspaceId = TargetWorkspace, Name = "Brand A" };
        var inB = new Brand { Id = Guid.NewGuid(), WorkspaceId = TargetWorkspace, Name = "Brand B" };
        var inC = new Brand { Id = Guid.NewGuid(), WorkspaceId = TargetWorkspace, Name = "Brand C" };
        var outside = new Brand { Id = Guid.NewGuid(), WorkspaceId = Guid.NewGuid(), Name = "Outside" };
        var run = Guid.NewGuid();
        ctx.Brands.AddRange(inA, inB, inC, outside);

        // Markets: shared name across two brands -> two sections, each with the name.
        ctx.Markets.Add(new Market { Id = Guid.NewGuid(), BrandId = inA.Id, Name = "United States", DiscoveryRunId = run });
        ctx.Markets.Add(new Market { Id = Guid.NewGuid(), BrandId = inB.Id, Name = "United States", DiscoveryRunId = run });
        ctx.Markets.Add(new Market { Id = Guid.NewGuid(), BrandId = inC.Id, Name = "United Kingdom", DiscoveryRunId = run });
        ctx.Markets.Add(new Market { Id = Guid.NewGuid(), BrandId = outside.Id, Name = "Should not appear", DiscoveryRunId = run });

        // Products: Brand A has two rows for "Resume Builder" (case differs)
        // simulating two discovery runs -> must collapse to one row in A's section.
        ctx.Products.Add(new Product { Id = Guid.NewGuid(), BrandId = inA.Id, Name = "Resume Builder", DiscoveryRunId = run });
        ctx.Products.Add(new Product { Id = Guid.NewGuid(), BrandId = inA.Id, Name = "resume builder", DiscoveryRunId = run });
        ctx.Products.Add(new Product { Id = Guid.NewGuid(), BrandId = inB.Id, Name = "Job Board", DiscoveryRunId = run });

        ctx.Audiences.Add(new Audience { Id = Guid.NewGuid(), BrandId = inA.Id, Name = "Job seekers", DiscoveryRunId = run });

        // Topics: same name across two brands -> two separate group rows.
        ctx.Topics.Add(new Topic { Id = Guid.NewGuid(), BrandId = inB.Id, Name = "Salary trends", DiscoveryRunId = run });
        ctx.Topics.Add(new Topic { Id = Guid.NewGuid(), BrandId = inC.Id, Name = "Salary trends", DiscoveryRunId = run });

        await ctx.SaveChangesAsync();

        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceDiscoverySummaryQuery(), CancellationToken.None);

        // Markets: Brand A and Brand B each have "United States", Brand C has "United Kingdom".
        result.Markets.Select(g => g.BrandName).Should().BeEquivalentTo(
            new[] { "Brand A", "Brand B", "Brand C" }, o => o.WithStrictOrdering());
        result.Markets[0].Items.Select(i => i.Name).Should().BeEquivalentTo(new[] { "United States" });
        result.Markets[1].Items.Select(i => i.Name).Should().BeEquivalentTo(new[] { "United States" });
        result.Markets[2].Items.Select(i => i.Name).Should().BeEquivalentTo(new[] { "United Kingdom" });

        // Products: Brand A's two rows for "Resume Builder" collapsed; Brand B has "Job Board".
        result.Products.Select(g => g.BrandName).Should().BeEquivalentTo(
            new[] { "Brand A", "Brand B" }, o => o.WithStrictOrdering());
        result.Products[0].Items.Select(i => i.Name).Should().ContainSingle().And.Contain("Resume Builder");
        result.Products[1].Items.Select(i => i.Name).Should().BeEquivalentTo(new[] { "Job Board" });

        // Audiences: only Brand A.
        result.Audiences.Select(g => g.BrandName).Should().BeEquivalentTo(new[] { "Brand A" });
        result.Audiences[0].Items.Select(i => i.Name).Should().BeEquivalentTo(new[] { "Job seekers" });

        // Topics: Brand B and Brand C both have "Salary trends".
        result.Topics.Select(g => g.BrandName).Should().BeEquivalentTo(
            new[] { "Brand B", "Brand C" }, o => o.WithStrictOrdering());
        result.Topics[0].Items.Select(i => i.Name).Should().BeEquivalentTo(new[] { "Salary trends" });
        result.Topics[1].Items.Select(i => i.Name).Should().BeEquivalentTo(new[] { "Salary trends" });

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

    [Fact]
    public async Task SortsItemsAlphabetically_WithinEachBrandGroup()
    {
        using var ctx = NewContext();
        var brand = new Brand { Id = Guid.NewGuid(), WorkspaceId = TargetWorkspace, Name = "Solo" };
        var run = Guid.NewGuid();
        ctx.Brands.Add(brand);
        ctx.Topics.AddRange(
            new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Zebra finance", DiscoveryRunId = run },
            new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "Apple farming", DiscoveryRunId = run },
            new Topic { Id = Guid.NewGuid(), BrandId = brand.Id, Name = "monkey research", DiscoveryRunId = run });
        await ctx.SaveChangesAsync();

        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceDiscoverySummaryQuery(), CancellationToken.None);

        result.Topics.Should().HaveCount(1);
        result.Topics[0].Items.Select(i => i.Name).Should().BeEquivalentTo(
            new[] { "Apple farming", "monkey research", "Zebra finance" }, o => o.WithStrictOrdering());
    }
}
