using AIVisibility.Application.Commands.Brands;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using FluentAssertions;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using Moq;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

public class CreateBrandCommandHandlerTests
{
    private readonly Mock<IAppDbContext> _dbMock;
    private readonly Mock<IBackgroundJobClient> _jobClientMock;
    private readonly CreateBrandCommandHandler _handler;

    public CreateBrandCommandHandlerTests()
    {
        _dbMock = new Mock<IAppDbContext>();
        _jobClientMock = new Mock<IBackgroundJobClient>();

        var brandsDbSet = CreateMockDbSet(new List<Brand>());
        var runsDbSet = CreateMockDbSet(new List<DiscoveryRun>());

        _dbMock.Setup(x => x.Brands).Returns(brandsDbSet.Object);
        _dbMock.Setup(x => x.DiscoveryRuns).Returns(runsDbSet.Object);
        _dbMock.Setup(x => x.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        _handler = new CreateBrandCommandHandler(_dbMock.Object, _jobClientMock.Object);
    }

    [Fact]
    public async Task Handle_ShouldCreateBrandAndDiscoveryRun()
    {
        var command = new CreateBrandCommand("Test Brand", "https://example.com", Guid.NewGuid());

        var result = await _handler.Handle(command, CancellationToken.None);

        result.BrandId.Should().NotBeEmpty();
        result.DiscoveryRunId.Should().NotBeEmpty();
        _dbMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ShouldEnqueueHangfireJob()
    {
        var command = new CreateBrandCommand("Test Brand", "https://example.com", Guid.NewGuid());

        await _handler.Handle(command, CancellationToken.None);

        _jobClientMock.Verify(x => x.Create(
            It.IsAny<Job>(),
            It.IsAny<IState>()), Times.Once);
    }

    private static Mock<DbSet<T>> CreateMockDbSet<T>(List<T> list) where T : class
    {
        var queryable = list.AsQueryable();
        var dbSet = new Mock<DbSet<T>>();
        dbSet.As<IQueryable<T>>().Setup(m => m.Provider).Returns(queryable.Provider);
        dbSet.As<IQueryable<T>>().Setup(m => m.Expression).Returns(queryable.Expression);
        dbSet.As<IQueryable<T>>().Setup(m => m.ElementType).Returns(queryable.ElementType);
        dbSet.As<IQueryable<T>>().Setup(m => m.GetEnumerator()).Returns(queryable.GetEnumerator());
        dbSet.Setup(d => d.Add(It.IsAny<T>())).Callback<T>(list.Add);
        return dbSet;
    }
}
