using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class AddBrandTopicCommandHandler : IRequestHandler<AddBrandTopicCommand, AddBrandTopicResult>
{
    private readonly IAppDbContext _db;

    public AddBrandTopicCommandHandler(IAppDbContext db) => _db = db;

    public async Task<AddBrandTopicResult> Handle(
        AddBrandTopicCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Topic name cannot be empty.");

        var brand = await _db.Brands.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found.");

        // Fetch names + compare in memory rather than EF.Functions.ILike,
        // which is provider-specific (and unavailable to the InMemory
        // database used by tests). The per-brand topic set is bounded, so
        // pulling it is cheap.
        var existing = await _db.Topics.AsNoTracking()
            .Where(t => t.BrandId == brand.Id)
            .Select(t => t.Name)
            .ToListAsync(cancellationToken);
        if (existing.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Topic '{name}' already exists on this brand.");

        var latestRunId = await _db.DiscoveryRuns.AsNoTracking()
            .Where(r => r.BrandId == brand.Id)
            .OrderByDescending(r => r.StartedAt)
            .Select(r => (Guid?)r.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "Brand has no DiscoveryRun to anchor the new topic to. Run discovery first.");

        var topic = new Topic
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = name,
            Confidence = 1.0,
            Source = CandidateSource.UserAdded,
            DiscoveryRunId = latestRunId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Topics.Add(topic);
        await _db.SaveChangesAsync(cancellationToken);

        return new AddBrandTopicResult(topic.Id, topic.Name);
    }
}
