using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Discovery;

public class ConfirmDiscoveryCommandHandler : IRequestHandler<ConfirmDiscoveryCommand, Unit>
{
    private readonly IAppDbContext _db;

    public ConfirmDiscoveryCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<Unit> Handle(ConfirmDiscoveryCommand request, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands
            .Include(b => b.BrandProfile)
            .Include(b => b.Products)
            .Include(b => b.Audiences)
            .Include(b => b.Markets)
            .Include(b => b.Topics)
            .Include(b => b.Competitors)
            .Include(b => b.TrustSignals)
            .Include(b => b.DiscoveryRuns)
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found");

        var confirmedSet = request.ConfirmedIds.ToHashSet();
        var dismissedSet = request.DismissedIds.ToHashSet();

        void UpdateStatus<T>(IEnumerable<T> entities) where T : class
        {
            foreach (var entity in entities)
            {
                var id = (Guid)entity.GetType().GetProperty("Id")!.GetValue(entity)!;
                var statusProp = entity.GetType().GetProperty("Status")!;
                if (confirmedSet.Contains(id))
                    statusProp.SetValue(entity, CandidateStatus.Confirmed);
                else if (dismissedSet.Contains(id))
                    statusProp.SetValue(entity, CandidateStatus.Dismissed);
            }
        }

        if (brand.BrandProfile != null)
        {
            if (confirmedSet.Contains(brand.BrandProfile.Id))
                brand.BrandProfile.Status = CandidateStatus.Confirmed;
            else if (dismissedSet.Contains(brand.BrandProfile.Id))
                brand.BrandProfile.Status = CandidateStatus.Dismissed;
        }

        UpdateStatus(brand.Products);
        UpdateStatus(brand.Audiences);
        UpdateStatus(brand.Markets);
        UpdateStatus(brand.Topics);
        UpdateStatus(brand.Competitors);
        UpdateStatus(brand.TrustSignals);

        var latestRun = brand.DiscoveryRuns
            .OrderByDescending(r => r.StartedAt)
            .FirstOrDefault();

        if (latestRun != null)
        {
            latestRun.Status = DiscoveryStatus.Completed;
            latestRun.CompletedAt = DateTime.UtcNow;
        }

        brand.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
