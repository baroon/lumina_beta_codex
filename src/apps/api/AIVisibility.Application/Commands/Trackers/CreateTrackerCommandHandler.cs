using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Trackers;

public class CreateTrackerCommandHandler : IRequestHandler<CreateTrackerCommand, CreateTrackerResult>
{
    /// <summary>Fixed prompt allocation for a new tracker (ADR-002 §7; default deferred there).</summary>
    public const int DefaultPromptAllocation = 30;

    private readonly IAppDbContext _db;

    public CreateTrackerCommandHandler(IAppDbContext db) => _db = db;

    public async Task<CreateTrackerResult> Handle(CreateTrackerCommand request, CancellationToken cancellationToken)
    {
        var brand =
            await _db.Brands.Include(b => b.BrandProfile).FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        var products = await _db.Products.Where(p => p.BrandId == brand.Id).ToListAsync(cancellationToken);
        var markets = await _db.Markets.Where(m => m.BrandId == brand.Id).ToListAsync(cancellationToken);
        var topics = await _db.Topics.Where(t => t.BrandId == brand.Id).ToListAsync(cancellationToken);
        var competitors = await _db.Competitors.Where(c => c.BrandId == brand.Id).ToListAsync(cancellationToken);
        var audiences = await _db.Audiences.Where(a => a.BrandId == brand.Id).ToListAsync(cancellationToken);
        var checks = await _db.VisibilityChecks.ToListAsync(cancellationToken);

        var generatedName = TrackerNaming.Generate(
            markets.FirstOrDefault()?.Name,
            brand.BrandProfile?.Category,
            products.FirstOrDefault()?.Name);

        var requested = request.Name?.Trim();
        var isNameUserEdited = !string.IsNullOrWhiteSpace(requested) && requested != generatedName;
        var name = isNameUserEdited ? requested! : generatedName;

        var now = DateTime.UtcNow;
        var tracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = name,
            IsNameUserEdited = isNameUserEdited,
            PromptAllocation = DefaultPromptAllocation,
            Cadence = Cadence.Daily,
            Timezone = "UTC",
            Status = TrackerStatus.Draft,
            CreatedAt = now,
            UpdatedAt = now,
            Topics = topics.Select(t => new TrackerTopic { Id = Guid.NewGuid(), TopicId = t.Id }).ToList(),
            Competitors = competitors
                .Select(c => new TrackerCompetitor { Id = Guid.NewGuid(), CompetitorId = c.Id })
                .ToList(),
            Products = products.Select(p => new TrackerProduct { Id = Guid.NewGuid(), ProductId = p.Id }).ToList(),
            Audiences = audiences.Select(a => new TrackerAudience { Id = Guid.NewGuid(), AudienceId = a.Id }).ToList(),
            Markets = markets.Select(m => new TrackerMarket { Id = Guid.NewGuid(), MarketId = m.Id }).ToList(),
            VisibilityChecks = checks
                .Select(vc => new TrackerVisibilityCheck { Id = Guid.NewGuid(), VisibilityCheckId = vc.Id })
                .ToList(),
        };

        _db.TrackerConfigurations.Add(tracker);
        await _db.SaveChangesAsync(cancellationToken);

        return new CreateTrackerResult(tracker.Id, tracker.Name);
    }
}
