using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace AIVisibility.Tests.TestHelpers;

/// <summary>
/// Test stand-in for <see cref="IServiceScopeFactory"/>. Every
/// <c>CreateScope</c> call resolves <see cref="IAppDbContext"/> via the
/// supplied factory so each call to <c>ExecuteOneAsync</c> can get its own
/// DbContext (matching production DI scoping) while still sharing the
/// underlying InMemory database. The two-arg overload returns the same
/// singleton for tests that don't exercise parallelism.
/// </summary>
internal sealed class FakeServiceScopeFactory : IServiceScopeFactory, IServiceProvider, IServiceScope
{
    private readonly Func<IAppDbContext> _dbFactory;
    private readonly IAnswerSignalWriter _writer;

    public FakeServiceScopeFactory(IAppDbContext db, IAnswerSignalWriter writer)
        : this(() => db, writer) { }

    public FakeServiceScopeFactory(Func<IAppDbContext> dbFactory, IAnswerSignalWriter writer)
    {
        _dbFactory = dbFactory;
        _writer = writer;
    }

    public IServiceScope CreateScope() => this;
    public IServiceProvider ServiceProvider => this;
    public void Dispose() { }

    public object? GetService(Type serviceType)
    {
        if (serviceType == typeof(IAppDbContext)) return _dbFactory();
        if (serviceType == typeof(IAnswerSignalWriter)) return _writer;
        return null;
    }
}
