using AIVisibility.Application.Queries.SourceTypes;
using AIVisibility.Domain.Entities;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetSourceTypesQueryHandler tests. Pure read of the source_types reference
/// table — the migration seeds 12 rows; the handler returns them ordered by
/// display_order so the FE dropdown renders deterministically (Phase 4 v1
/// plan §D12).
/// </summary>
public class GetSourceTypesQueryHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task ReturnsAllRows_OrderedByDisplayOrder()
    {
        using var ctx = NewContext();
        ctx.SourceTypes.Add(new SourceTypeReference { Id = Guid.NewGuid(), Code = "Editorial", Name = "Editorial", Description = "d", DisplayOrder = 5 });
        ctx.SourceTypes.Add(new SourceTypeReference { Id = Guid.NewGuid(), Code = "Owned", Name = "Owned", Description = "d", DisplayOrder = 1 });
        ctx.SourceTypes.Add(new SourceTypeReference { Id = Guid.NewGuid(), Code = "Competitor", Name = "Competitor", Description = "d", DisplayOrder = 2 });
        ctx.SaveChanges();

        var sut = new GetSourceTypesQueryHandler(ctx);
        var result = await sut.Handle(new GetSourceTypesQuery(), CancellationToken.None);

        result.Select(r => r.Code).Should().ContainInOrder("Owned", "Competitor", "Editorial");
    }

    [Fact]
    public async Task ReturnsEmpty_WhenReferenceTableIsEmpty()
    {
        using var ctx = NewContext();
        var sut = new GetSourceTypesQueryHandler(ctx);
        var result = await sut.Handle(new GetSourceTypesQuery(), CancellationToken.None);
        result.Should().BeEmpty();
    }
}
