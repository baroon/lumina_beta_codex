using AIVisibility.Application.Behaviors;
using AIVisibility.Application.Commands.Discovery;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace AIVisibility.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly);
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        services.AddScoped<IRunDiscoveryJobHandler, RunDiscoveryJobHandler>();

        return services;
    }
}
