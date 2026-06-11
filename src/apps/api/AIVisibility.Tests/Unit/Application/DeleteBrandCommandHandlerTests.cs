using AIVisibility.Application.Commands.Brands;
using AIVisibility.Domain.Entities;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Same scope-restriction reasoning as
/// <see cref="DeleteTrackerCommandHandlerTests"/>: the handler is a
/// one-liner load-remove-save, and full-subtree cascade verification
/// (every dimension, every tracker, every discovery run, every scan)
/// lives in the Postgres FK constraints and the integration suite.
/// Unit tests cover the load-remove-save path and the missing-brand
/// error case.
/// </summary>
public class DeleteBrandCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Delete_RemovesBrandRow()
    {
        using var ctx = NewContext();
        var brand = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme", WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(brand);
        ctx.SaveChanges();

        await new DeleteBrandCommandHandler(ctx).Handle(
            new DeleteBrandCommand(brand.Id),
            CancellationToken.None);

        ctx.Brands.Any(b => b.Id == brand.Id).Should().BeFalse();
    }

    [Fact]
    public async Task Delete_Throws_WhenBrandNotFound()
    {
        using var ctx = NewContext();

        Func<Task> act = () => new DeleteBrandCommandHandler(ctx).Handle(
            new DeleteBrandCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*not found*");
    }

    [Fact]
    public async Task Delete_LeavesSiblingBrandIntact()
    {
        using var ctx = NewContext();
        var doomed = new Brand
        {
            Id = Guid.NewGuid(), Name = "Acme", WebsiteUrl = "https://acme.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var sibling = new Brand
        {
            Id = Guid.NewGuid(), Name = "Beta", WebsiteUrl = "https://beta.com",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        ctx.Brands.Add(doomed);
        ctx.Brands.Add(sibling);
        ctx.SaveChanges();

        await new DeleteBrandCommandHandler(ctx).Handle(
            new DeleteBrandCommand(doomed.Id),
            CancellationToken.None);

        ctx.Brands.Any(b => b.Id == sibling.Id).Should().BeTrue();
    }
}
