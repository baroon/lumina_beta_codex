using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Discovery;

public class ConfirmDiscoveryCommandHandler : IRequestHandler<ConfirmDiscoveryCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly IDiscoveryDraftStore _draftStore;

    public ConfirmDiscoveryCommandHandler(IAppDbContext db, IDiscoveryDraftStore draftStore)
    {
        _db = db;
        _draftStore = draftStore;
    }

    public async Task<Unit> Handle(ConfirmDiscoveryCommand request, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands
            .Include(b => b.DiscoveryRuns)
            .FirstOrDefaultAsync(b => b.Id == request.BrandId, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found");

        var latestRun = brand.DiscoveryRuns
            .OrderByDescending(r => r.StartedAt)
            .FirstOrDefault()
            ?? throw new InvalidOperationException($"No discovery run found for brand {request.BrandId}");

        // Completion gating (REQ-001 §16): require a market, at least one topic, and either a
        // confirmed product/service or a brand category before the run can be completed.
        var failures = new List<ValidationFailure>();
        if (request.Markets.Count == 0)
            failures.Add(new ValidationFailure("Markets", "At least one market must be confirmed before completing discovery."));
        if (request.Topics.Count == 0)
            failures.Add(new ValidationFailure("Topics", "At least one topic must be confirmed before completing discovery."));
        if (request.Products.Count == 0 && string.IsNullOrWhiteSpace(request.BrandProfile?.Category))
            failures.Add(new ValidationFailure("Products", "At least one product or service must be confirmed, or a brand category must be set, before completing discovery."));

        // Type is mandatory for products and trust signals (must mirror the UX).
        foreach (var p in request.Products)
            if (!IsValidEnum<ProductType>(Meta(p, "productType")))
                failures.Add(new ValidationFailure("Products", $"Product \"{p.Name}\" must have a valid type."));
        foreach (var ts in request.TrustSignals)
            if (!IsValidEnum<TrustSignalType>(Meta(ts, "signalType")))
                failures.Add(new ValidationFailure("TrustSignals", $"Trust signal \"{ts.Name}\" must have a valid type."));

        if (failures.Count > 0)
            throw new ValidationException(failures);

        var runId = latestRun.Id;

        // Idempotent confirm: clear any prior discovery rows for this brand so re-confirming
        // (or a double-submit) replaces rather than duplicates. The brand profile is upserted in
        // place because it has a unique index on brand_id (delete+insert would conflict).
        _db.Products.RemoveRange(await _db.Products.Where(x => x.BrandId == brand.Id).ToListAsync(cancellationToken));
        _db.Audiences.RemoveRange(await _db.Audiences.Where(x => x.BrandId == brand.Id).ToListAsync(cancellationToken));
        _db.Markets.RemoveRange(await _db.Markets.Where(x => x.BrandId == brand.Id).ToListAsync(cancellationToken));
        _db.Topics.RemoveRange(await _db.Topics.Where(x => x.BrandId == brand.Id).ToListAsync(cancellationToken));
        _db.Competitors.RemoveRange(await _db.Competitors.Where(x => x.BrandId == brand.Id).ToListAsync(cancellationToken));
        _db.TrustSignals.RemoveRange(await _db.TrustSignals.Where(x => x.BrandId == brand.Id).ToListAsync(cancellationToken));

        var now = DateTime.UtcNow;

        if (request.BrandProfile is { } bp)
        {
            var profile = await _db.BrandProfiles.FirstOrDefaultAsync(x => x.BrandId == brand.Id, cancellationToken);
            if (profile is null)
            {
                profile = new BrandProfile
                {
                    Id = Guid.NewGuid(),
                    BrandId = brand.Id,
                    DiscoveryRunId = runId,
                    CreatedAt = now,
                };
                _db.BrandProfiles.Add(profile);
            }
            else
            {
                profile.DiscoveryRunId = runId;
            }
            profile.ShortDescription = bp.ShortDescription;
            profile.Industry = bp.Industry;
            profile.Category = bp.Category;
            profile.Positioning = bp.Positioning;
            profile.Confidence = bp.Confidence;
            profile.Source = ParseSource(bp.Source);
            profile.UpdatedAt = now;
        }

        foreach (var p in request.Products)
            _db.Products.Add(new Product
            {
                Id = Guid.NewGuid(),
                BrandId = brand.Id,
                DiscoveryRunId = runId,
                Name = p.Name,
                Aliases = (p.Aliases ?? new List<string>())
                    .Select(a => a.Trim())
                    .Where(a => a.Length > 0)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                Description = p.Description,
                Confidence = p.Confidence,
                Source = ParseSource(p.Source),
                ProductType = ParseEnum(Meta(p, "productType"), ProductType.Product),
                CreatedAt = now,
                UpdatedAt = now,
            });

        foreach (var a in request.Audiences)
            _db.Audiences.Add(new Audience
            {
                Id = Guid.NewGuid(),
                BrandId = brand.Id,
                DiscoveryRunId = runId,
                Name = a.Name,
                Description = a.Description,
                Confidence = a.Confidence,
                Source = ParseSource(a.Source),
                CreatedAt = now,
                UpdatedAt = now,
            });

        foreach (var m in request.Markets)
            _db.Markets.Add(new Market
            {
                Id = Guid.NewGuid(),
                BrandId = brand.Id,
                DiscoveryRunId = runId,
                Name = m.Name,
                Confidence = m.Confidence,
                Source = ParseSource(m.Source),
                CountryCode = NormalizeCountryCode(Meta(m, "countryCode")),
                CreatedAt = now,
                UpdatedAt = now,
            });

        foreach (var t in request.Topics)
            _db.Topics.Add(new Topic
            {
                Id = Guid.NewGuid(),
                BrandId = brand.Id,
                DiscoveryRunId = runId,
                Name = t.Name,
                Confidence = t.Confidence,
                Source = ParseSource(t.Source),
                CreatedAt = now,
                UpdatedAt = now,
            });

        foreach (var c in request.Competitors)
            _db.Competitors.Add(new Competitor
            {
                Id = Guid.NewGuid(),
                BrandId = brand.Id,
                DiscoveryRunId = runId,
                Name = c.Name,
                Aliases = (c.Aliases ?? new List<string>())
                    .Select(a => a.Trim())
                    .Where(a => a.Length > 0)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                Description = c.Description,
                Confidence = c.Confidence,
                Source = ParseSource(c.Source),
                Domain = Meta(c, "domain"),
                CreatedAt = now,
                UpdatedAt = now,
            });

        foreach (var ts in request.TrustSignals)
            _db.TrustSignals.Add(new TrustSignal
            {
                Id = Guid.NewGuid(),
                BrandId = brand.Id,
                DiscoveryRunId = runId,
                Name = ts.Name,
                Description = ts.Description,
                Confidence = ts.Confidence,
                Source = ParseSource(ts.Source),
                SignalType = ParseEnum(Meta(ts, "signalType"), TrustSignalType.TestimonialsAndReviews),
                CreatedAt = now,
                UpdatedAt = now,
            });

        latestRun.Status = DiscoveryStatus.Completed;
        var confirmedNow = DateTime.UtcNow;
        latestRun.ConfirmedAt = confirmedNow;
        latestRun.CompletedAt = confirmedNow;
        brand.Aliases = (request.Aliases ?? new List<string>())
            .Select(a => a.Trim())
            .Where(a => a.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        brand.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        // The transient draft is now obsolete — drop it so GetDiscoveryResults reports the
        // completed run status and the UI advances past the confirmation screen.
        _draftStore.Remove(latestRun.Id);

        return Unit.Value;
    }

    private static string? Meta(ConfirmCandidateInput c, string key) =>
        c.Metadata != null && c.Metadata.TryGetValue(key, out var v) ? v : null;

    private static CandidateSource ParseSource(string? value) =>
        Enum.TryParse<CandidateSource>(value, ignoreCase: true, out var r) ? r : CandidateSource.LLMSuggested;

    private static T ParseEnum<T>(string? value, T defaultValue) where T : struct, Enum =>
        !string.IsNullOrWhiteSpace(value) && Enum.TryParse<T>(value, ignoreCase: true, out var r) ? r : defaultValue;

    private static bool IsValidEnum<T>(string? value) where T : struct, Enum =>
        !string.IsNullOrWhiteSpace(value) && Enum.TryParse<T>(value, ignoreCase: true, out _);

    private static string? NormalizeCountryCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim().ToUpperInvariant();
        return trimmed.Length == 2 && trimmed.All(char.IsLetter) ? trimmed : null;
    }
}
