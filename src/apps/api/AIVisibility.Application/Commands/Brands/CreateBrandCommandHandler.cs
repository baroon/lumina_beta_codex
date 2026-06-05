using AIVisibility.Application.Commands.Discovery;
using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Hangfire;
using MediatR;
using Microsoft.EntityFrameworkCore;

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
        // Case-insensitive lookup first — the DB has a unique index on
        // (workspace_id, LOWER(name)) so we'd otherwise hit a constraint
        // violation on retry. Reusing the existing brand is what the user
        // wants: discovery for "Nostri" submitted twice should reuse the
        // first row, not create "Nostri × 2" (deferred-work doc, item 1).
        var normalized = (request.Name ?? string.Empty).Trim();
        var lowered = normalized.ToLowerInvariant();
        var existing = await _db.Brands.AsNoTracking()
            .Where(b => b.WorkspaceId == request.WorkspaceId
                     && b.Name.ToLower() == lowered)
            .Select(b => new { b.Id })
            .FirstOrDefaultAsync(cancellationToken);
        if (existing != null)
        {
            // Enqueue a fresh discovery run against the existing brand so the
            // caller's "re-discover this brand" intent still triggers work.
            var rerun = new DiscoveryRun
            {
                Id = Guid.NewGuid(),
                BrandId = existing.Id,
                Status = DiscoveryStatus.Pending,
                StartedAt = DateTime.UtcNow,
            };
            _db.DiscoveryRuns.Add(rerun);
            await _db.SaveChangesAsync(cancellationToken);
            _jobClient.Enqueue<IRunDiscoveryJobHandler>(
                handler => handler.ExecuteAsync(existing.Id, rerun.Id, CancellationToken.None));
            return new CreateBrandResult(existing.Id, rerun.Id);
        }

        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = normalized,
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
