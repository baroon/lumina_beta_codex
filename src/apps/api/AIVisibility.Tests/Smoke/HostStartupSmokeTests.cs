using System.Net;
using FluentAssertions;

namespace AIVisibility.Tests.Smoke;

/// <summary>
/// Minimal startup-time smoke tests. Catches a class of bugs that unit tests
/// can't see: DI graph errors, missing service registrations, throws inside
/// hosted-service constructors, and config-time mistakes (e.g., using the
/// static Hangfire RecurringJob.AddOrUpdate API before JobStorage.Current
/// is initialized — that class of bug shipped once and took an e2e verify
/// cycle to find).
///
/// The test factory boots the real Program host with three surgical overrides
/// (connection string skip, EF in-memory, Hangfire in-memory). Everything else
/// runs through the production path.
/// </summary>
public class HostStartupSmokeTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public HostStartupSmokeTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public void HostBuildsAndStarts_WithoutException()
    {
        // CreateClient triggers the full startup pipeline. If anything in Program.cs
        // throws (missing service, recurring-job registration crash, hosted-service
        // constructor failure, etc.), this line fails.
        var client = _factory.CreateClient();
        client.Should().NotBeNull();
    }

    [Fact]
    public async Task BrandsEndpoint_RespondsSuccessfully()
    {
        // Proves controllers + MediatR + EF DbContext are all wired correctly end-to-end.
        // Empty in-memory DB → the handler returns an empty list, which is enough to
        // confirm the request reached a real handler and back.
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/brands");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().StartWith("[").And.EndWith("]");
    }
}
