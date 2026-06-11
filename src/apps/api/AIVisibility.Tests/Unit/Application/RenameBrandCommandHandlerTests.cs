using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Mirrors <see cref="RenameTrackerCommandHandlerTests"/>: covers trim,
/// empty rejection, the no-op shortcut when the trimmed name is
/// unchanged, per-workspace case-insensitive uniqueness, and the
/// UpdatedAt advancement. The Postgres unique-violation fallback path
/// for the race between the pre-check and the insert is not reproducible
/// against the InMemory provider — that path lives in the integration
/// suite.
/// </summary>
public class RenameBrandCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private sealed record Seed(
        Guid WorkspaceId, Guid BrandId, Guid SiblingBrandId,
        Guid OtherWorkspaceBrandId);

    private static Seed Build(AppDbContext ctx)
    {
        var workspaceId = Guid.NewGuid();
        var brand = new Brand
        {
            Id = Guid.NewGuid(), WorkspaceId = workspaceId,
            Name = "Acme", WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        var sibling = new Brand
        {
            Id = Guid.NewGuid(), WorkspaceId = workspaceId,
            Name = "Beta", WebsiteUrl = "https://beta.com",
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        // A brand named "Gamma" lives in a different workspace.
        // Renaming "Beta" (in our workspace) → "Gamma" must succeed —
        // uniqueness scope is per workspace, not global.
        var otherWorkspaceBrand = new Brand
        {
            Id = Guid.NewGuid(), WorkspaceId = Guid.NewGuid(),
            Name = "Gamma", WebsiteUrl = "https://gamma.com",
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7),
        };
        ctx.Brands.Add(brand);
        ctx.Brands.Add(sibling);
        ctx.Brands.Add(otherWorkspaceBrand);
        ctx.SaveChanges();
        return new Seed(workspaceId, brand.Id, sibling.Id, otherWorkspaceBrand.Id);
    }

    [Fact]
    public async Task Rename_PersistsTrimmedName()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameBrandCommandHandler(ctx).Handle(
            new RenameBrandCommand(seed.BrandId, "  Acme Corp  "),
            CancellationToken.None);

        result.Name.Should().Be("Acme Corp");
        ctx.Brands.Single(b => b.Id == seed.BrandId).Name.Should().Be("Acme Corp");
    }

    [Fact]
    public async Task Rename_AdvancesUpdatedAt()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var before = ctx.Brands.Single(b => b.Id == seed.BrandId).UpdatedAt;

        await new RenameBrandCommandHandler(ctx).Handle(
            new RenameBrandCommand(seed.BrandId, "Acme Corp"),
            CancellationToken.None);

        ctx.Brands.Single(b => b.Id == seed.BrandId).UpdatedAt.Should().BeAfter(before);
    }

    [Fact]
    public async Task Rename_IsNoOp_WhenNameIsUnchanged()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var before = ctx.Brands.Single(b => b.Id == seed.BrandId).UpdatedAt;

        var result = await new RenameBrandCommandHandler(ctx).Handle(
            new RenameBrandCommand(seed.BrandId, "Acme"),
            CancellationToken.None);

        result.Name.Should().Be("Acme");
        ctx.Brands.Single(b => b.Id == seed.BrandId).UpdatedAt.Should().Be(before);
    }

    [Fact]
    public async Task Rename_Throws_WhenNameIsEmptyOrWhitespace()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var handler = new RenameBrandCommandHandler(ctx);

        Func<Task> empty = () => handler.Handle(
            new RenameBrandCommand(seed.BrandId, ""), CancellationToken.None);
        Func<Task> whitespace = () => handler.Handle(
            new RenameBrandCommand(seed.BrandId, "   "), CancellationToken.None);

        await empty.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
        await whitespace.Should().ThrowAsync<InvalidOperationException>().WithMessage("*empty*");
    }

    [Fact]
    public async Task Rename_Throws_WhenBrandNotFound()
    {
        using var ctx = NewContext();
        Build(ctx);

        Func<Task> act = () => new RenameBrandCommandHandler(ctx).Handle(
            new RenameBrandCommand(Guid.NewGuid(), "Anything"),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Rename_Throws_OnCaseInsensitiveCollision_WithSibling()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        Func<Task> act = () => new RenameBrandCommandHandler(ctx).Handle(
            new RenameBrandCommand(seed.BrandId, "BETA"),
            CancellationToken.None);

        await act.Should().ThrowAsync<DuplicateBrandNameException>();
        ctx.Brands.Single(b => b.Id == seed.BrandId).Name.Should().Be("Acme");
    }

    [Fact]
    public async Task Rename_AllowsSameName_AcrossDifferentWorkspaces()
    {
        // "Gamma" exists in a different workspace. Renaming "Beta" (in
        // our workspace) → "Gamma" must succeed — uniqueness is per
        // workspace, not global.
        using var ctx = NewContext();
        var seed = Build(ctx);

        var result = await new RenameBrandCommandHandler(ctx).Handle(
            new RenameBrandCommand(seed.SiblingBrandId, "Gamma"),
            CancellationToken.None);

        result.Name.Should().Be("Gamma");
        ctx.Brands.Single(b => b.Id == seed.SiblingBrandId).Name.Should().Be("Gamma");
        // Other-workspace "Gamma" still untouched.
        ctx.Brands.Single(b => b.Id == seed.OtherWorkspaceBrandId).Name.Should().Be("Gamma");
    }
}
