var builder = Host.CreateDefaultBuilder(args);

builder.ConfigureServices(services =>
{
});

var host = builder.Build();
host.Run();
