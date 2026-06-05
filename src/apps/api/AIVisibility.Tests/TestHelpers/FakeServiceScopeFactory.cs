using AIVisibility.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace AIVisibility.Tests.TestHelpers;

/// <summary>
/// Test stand-in for <see cref="IServiceScopeFactory"/>. Every
/// <c>CreateScope</c> call returns a scope whose <c>ServiceProvider</c>
/// resolves <see cref="IAppDbContext"/> and <see cref="IAnswerSignalWriter"/>
/// to the same instances the test owns — so the in-memory DbContext is
/// shared across the parallel platform fan-out without overlapping
/// (the EF Core in-memory provider does not handle real concurrent
/// SaveChangesAsync calls, which is fine because the tests don't actually
/// race the work, they just exercise the new parallel code path).
/// </summary>
internal sealed class FakeServiceScopeFactory : IServiceScopeFactory, IServiceProvider, IServiceScope
{
    private readonly IAppDbContext _db;
    private readonly IAnswerSignalWriter _writer;

    public FakeServiceScopeFactory(IAppDbContext db, IAnswerSignalWriter writer)
    {
        _db = db;
        _writer = writer;
    }

    public IServiceScope CreateScope() => this;
    public IServiceProvider ServiceProvider => this;
    public void Dispose() { }

    public object? GetService(Type serviceType)
    {
        if (serviceType == typeof(IAppDbContext)) return _db;
        if (serviceType == typeof(IAnswerSignalWriter)) return _writer;
        return null;
    }
}
