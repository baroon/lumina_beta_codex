using AIVisibility.Application.Commands.Discovery;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AIVisibility.Tests.Unit.Application;

public class ResuggestCommandHandlerTests
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
        var handler = new ResuggestCommandHandler(new Mock<IResuggestService>().Object, ctx);

        var command = new ResuggestCommand(Guid.NewGuid(), null, null, new(), new(), new());

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Handle_ShouldMapServiceResultToDto()
    {
        using var ctx = NewContext();
        var brand = SeedBrand(ctx);

        var service = new Mock<IResuggestService>();
        service.Setup(s => s.ResuggestAsync(It.IsAny<ResuggestContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResuggestResult(
                new List<Competitor>
                {
                    new() { Id = Guid.NewGuid(), Name = "Acme", Domain = "acme.com", Confidence = 0.8, Source = CandidateSource.LLMSuggested }
                },
                new List<Topic>
                {
                    new() { Id = Guid.NewGuid(), Name = "Pricing", Confidence = 0.7, Source = CandidateSource.LLMSuggested }
                }));

        var handler = new ResuggestCommandHandler(service.Object, ctx);
        var command = new ResuggestCommand(brand.Id, "Tech", "SaaS", new() { "Product A" }, new(), new());

        var result = await handler.Handle(command, CancellationToken.None);

        result.Competitors.Should().HaveCount(1);
        result.Competitors[0].Name.Should().Be("Acme");
        result.Competitors[0].Source.Should().Be("LLMSuggested");
        result.Competitors[0].Metadata["domain"].Should().Be("acme.com");
        result.Topics.Should().HaveCount(1);
        result.Topics[0].Name.Should().Be("Pricing");
        result.Topics[0].Confidence.Should().Be(0.7);
    }

    [Fact]
    public async Task Handle_ShouldPassBrandNameAndRequestContextToService()
    {
        using var ctx = NewContext();
        var brand = SeedBrand(ctx);

        ResuggestContext? captured = null;
        var service = new Mock<IResuggestService>();
        service.Setup(s => s.ResuggestAsync(It.IsAny<ResuggestContext>(), It.IsAny<CancellationToken>()))
            .Callback<ResuggestContext, CancellationToken>((c, _) => captured = c)
            .ReturnsAsync(new ResuggestResult(new(), new()));

        var handler = new ResuggestCommandHandler(service.Object, ctx);
        var command = new ResuggestCommand(brand.Id, "Tech", "SaaS",
            new() { "Product A" }, new() { "Marketers" }, new() { "US" });

        await handler.Handle(command, CancellationToken.None);

        captured.Should().NotBeNull();
        captured!.BrandName.Should().Be("Test Brand");
        captured.Industry.Should().Be("Tech");
        captured.Products.Should().ContainSingle().Which.Should().Be("Product A");
        captured.Markets.Should().Contain("US");
    }
}
