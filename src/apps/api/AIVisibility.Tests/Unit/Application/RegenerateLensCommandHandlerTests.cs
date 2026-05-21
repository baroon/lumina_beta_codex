using AIVisibility.Application.Commands.Discovery;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AIVisibility.Tests.Unit.Application;

public class RegenerateLensCommandHandlerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static Brand SeedBrand(AppDbContext ctx)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = "Test Brand",
            WebsiteUrl = "https://test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Brands.Add(brand);
        ctx.SaveChanges();
        return brand;
    }

    [Fact]
    public async Task Handle_ShouldThrowWhenBrandNotFound()
    {
        using var ctx = NewContext();
        var handler = new RegenerateLensCommandHandler(new Mock<IResuggestService>().Object, ctx);

        var command = new RegenerateLensCommand(Guid.NewGuid(), "topics", null, null, new(), new(), new());

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Handle_ShouldReturnRequestedLensWithMappedCandidates()
    {
        using var ctx = NewContext();
        var brand = SeedBrand(ctx);

        var service = new Mock<IResuggestService>();
        service.Setup(s => s.RegenerateLensAsync(It.IsAny<ResuggestContext>(), "topics", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LensRegenerateResult(new List<LensCandidate>
            {
                new("Pricing", "How pricing is perceived", 0.9, "LLMSuggested",
                    new Dictionary<string, object?> { ["k"] = "v" })
            }));

        var handler = new RegenerateLensCommandHandler(service.Object, ctx);
        var command = new RegenerateLensCommand(brand.Id, "topics", "Tech", "SaaS", new(), new(), new());

        var result = await handler.Handle(command, CancellationToken.None);

        result.Lens.Should().Be("topics");
        result.Candidates.Should().HaveCount(1);
        result.Candidates[0].Name.Should().Be("Pricing");
        result.Candidates[0].Source.Should().Be("LLMSuggested");
        result.Candidates[0].Metadata["k"].Should().Be("v");
    }

    [Fact]
    public async Task Handle_ShouldPassLensAndContextToService()
    {
        using var ctx = NewContext();
        var brand = SeedBrand(ctx);

        ResuggestContext? captured = null;
        var service = new Mock<IResuggestService>();
        service.Setup(s => s.RegenerateLensAsync(It.IsAny<ResuggestContext>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<ResuggestContext, string, CancellationToken>((c, _, _) => captured = c)
            .ReturnsAsync(new LensRegenerateResult(new List<LensCandidate>()));

        var handler = new RegenerateLensCommandHandler(service.Object, ctx);
        var command = new RegenerateLensCommand(brand.Id, "competitors", "Tech", "SaaS",
            new() { "Product A" }, new() { "Marketers" }, new() { "US" });

        await handler.Handle(command, CancellationToken.None);

        captured.Should().NotBeNull();
        captured!.BrandName.Should().Be("Test Brand");
        captured.Category.Should().Be("SaaS");
        service.Verify(s => s.RegenerateLensAsync(It.IsAny<ResuggestContext>(), "competitors", It.IsAny<CancellationToken>()), Times.Once);
    }
}
