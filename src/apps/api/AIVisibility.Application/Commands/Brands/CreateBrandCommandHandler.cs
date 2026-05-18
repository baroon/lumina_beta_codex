using AIVisibility.Application.Commands.Discovery;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Hangfire;
using MediatR;

namespace AIVisibility.Application.Commands.Brands;

public class CreateBrandCommandHandler : IRequestHandler<CreateBrandCommand, CreateBrandResult>
{
    private readonly IAppDbContext _db;
    private readonly IBackgroundJobClient _jobClient;

    public CreateBrandCommandHandler(IAppDbContext db, IBackgroundJobClient jobClient)
    {
        _db = db;
        _jobClient = jobClient;
    }

    public async Task<CreateBrandResult> Handle(CreateBrandCommand request, CancellationToken cancellationToken)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            WebsiteUrl = request.WebsiteUrl,
            WorkspaceId = request.WorkspaceId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var discoveryRun = new DiscoveryRun
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Status = DiscoveryStatus.Pending,
            StartedAt = DateTime.UtcNow
        };

        _db.Brands.Add(brand);
        _db.DiscoveryRuns.Add(discoveryRun);
        await _db.SaveChangesAsync(cancellationToken);

        _jobClient.Enqueue<IRunDiscoveryJobHandler>(
            handler => handler.ExecuteAsync(brand.Id, discoveryRun.Id, CancellationToken.None));

        return new CreateBrandResult(brand.Id, discoveryRun.Id);
    }
}
