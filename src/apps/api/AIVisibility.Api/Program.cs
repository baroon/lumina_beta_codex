using AIVisibility.Api.Filters;
using AIVisibility.Application;
using AIVisibility.Infrastructure;
using Hangfire;
using Hangfire.PostgreSql;
using Npgsql;

// DiscoveryHub is in AIVisibility.Infrastructure namespace (already imported above)

var builder = WebApplication.CreateBuilder(args);

// Local-only overrides (e.g. API keys). Gitignored; optional in all environments.
// Loaded last so it overrides appsettings.json / appsettings.{Environment}.json.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Core services
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ProblemDetailsExceptionFilter>();
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();

// Application & Infrastructure
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Hangfire
var connString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(connString)));
builder.Services.AddHangfireServer();

// CORS for frontend dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Ensure Hangfire schema exists
var hangfireConnString = app.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(hangfireConnString))
{
    using var conn = new NpgsqlConnection(hangfireConnString);
    conn.Open();
    using var cmd = conn.CreateCommand();
    cmd.CommandText = "CREATE SCHEMA IF NOT EXISTS hangfire";
    cmd.ExecuteNonQuery();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseHangfireDashboard("/hangfire");
}

app.UseCors("DevCors");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapHub<DiscoveryHub>("/hubs/discovery");

app.Run();
