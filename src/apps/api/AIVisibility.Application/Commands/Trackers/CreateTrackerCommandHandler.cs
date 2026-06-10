using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Trackers;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AIVisibility.Application.Commands.Trackers;

public class CreateTrackerCommandHandler : IRequestHandler<CreateTrackerCommand, CreateTrackerResult>
{
    /// <summary>Fixed prompt allocation for a new tracker (ADR-002 §7; default deferred there).</summary>
    public const int DefaultPromptAllocation = 30;

    /// <summary>
    /// Bound on race-driven retries of the auto-named create path. A retry
    /// only happens when two concurrent creates queried the same set of
    /// existing names and one of them lost the unique-index race; reloading
    /// the names lets the next retry pick the next free suffix. Three is
    /// plenty in practice — multi-tracker creates are user-initiated.
    /// </summary>
    private const int MaxAutoNameRetries = 3;

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
        var checks = await _db.Lenses.ToListAsync(cancellationToken);

        var requested = request.Name?.Trim();
        var existingNames = await _db.TrackerConfigurations
            .Where(t => t.BrandId == brand.Id)
            .Select(t => t.Name)
            .ToListAsync(cancellationToken);

        string name;
        bool isNameUserEdited;
        if (!string.IsNullOrWhiteSpace(requested))
        {
            if (existingNames.Any(n => string.Equals(n, requested, StringComparison.OrdinalIgnoreCase)))
                throw new DuplicateTrackerNameException(requested);
            var generatedComparable = TrackerNaming.Generate(
                markets.FirstOrDefault()?.Name,
                brand.BrandProfile?.Category,
                products.FirstOrDefault()?.Name);
            isNameUserEdited = requested != generatedComparable;
            name = requested;
        }
        else
        {
            name = TrackerNaming.GenerateUnique(
                markets.FirstOrDefault()?.Name,
                brand.BrandProfile?.Category,
                products.FirstOrDefault()?.Name,
                existingNames);
            isNameUserEdited = false;
        }

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
            Topics = topics.Select(t => new TrackerTopic { TopicId = t.Id }).ToList(),
            Competitors = competitors
                .Select(c => new TrackerCompetitor { CompetitorId = c.Id })
                .ToList(),
            Products = products.Select(p => new TrackerProduct { ProductId = p.Id }).ToList(),
            Audiences = audiences.Select(a => new TrackerAudience { AudienceId = a.Id }).ToList(),
            Markets = markets.Select(m => new TrackerMarket { MarketId = m.Id }).ToList(),
            Lenses = checks
                .Select(vc => new TrackerLens { LensId = vc.Id })
                .ToList(),
        };

        _db.TrackerConfigurations.Add(tracker);

        for (var attempt = 0; ; attempt++)
        {
            try
            {
                await _db.SaveChangesAsync(cancellationToken);
                return new CreateTrackerResult(tracker.Id, tracker.Name);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                // A concurrent create grabbed the same suffix between our
                // existing-names query and the insert. User-supplied names
                // surface to the API layer; auto-named creates retry with a
                // fresh suffix lookup.
                if (isNameUserEdited || attempt >= MaxAutoNameRetries)
                    throw new DuplicateTrackerNameException(tracker.Name);

                existingNames = await _db.TrackerConfigurations
                    .Where(t => t.BrandId == brand.Id)
                    .Select(t => t.Name)
                    .ToListAsync(cancellationToken);
                tracker.Name = TrackerNaming.GenerateUnique(
                    markets.FirstOrDefault()?.Name,
                    brand.BrandProfile?.Category,
                    products.FirstOrDefault()?.Name,
                    existingNames);
            }
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation;
}
