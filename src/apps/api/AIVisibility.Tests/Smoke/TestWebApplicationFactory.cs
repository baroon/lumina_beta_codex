using AIVisibility.Application.Interfaces;
using AIVisibility.Infrastructure.Data;
using Hangfire;
using Hangfire.InMemory;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AIVisibility.Tests.Smoke;

/// <summary>
/// Factory that boots the real Program host with three surgical overrides so we
/// don't need a live Postgres or external network for a startup-time smoke test:
///   1. Connection string forced to empty so Program.cs skips the Hangfire schema
///      bootstrap block.
///   2. EF DbContext swapped for the in-memory provider.
///   3. Hangfire reconfigured to use in-memory storage so the AddHangfireServer
///      hosted-service start works without a DB.
///
/// Everything else — DI, MediatR, controller routing, every BackgroundService,
/// every Hangfire-targeted service registration — runs through the production path.
/// </summary>
public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // Empty triggers the `if (!string.IsNullOrEmpty(...))` skip in Program.cs
                // around the Hangfire schema-create SQL.
                ["ConnectionStrings:DefaultConnection"] = "",
            });
        });

        builder.ConfigureServices(services =>
        {
            // EF: replace the Postgres DbContext options with an in-memory DB.
            var efDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (efDescriptor is not null) services.Remove(efDescriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase($"smoke-{Guid.NewGuid()}"));

            services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

            // Hangfire: AddHangfire allows the last storage configuration to win,
            // so this overrides the Postgres storage from Program.cs without removing
            // any registrations. Verified against Hangfire 1.8.17.
            services.AddHangfire(cfg => cfg.UseInMemoryStorage());
        });
    }
}
