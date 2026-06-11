using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class UpdateBrandCompetitorDomainCommandHandler
    : IRequestHandler<UpdateBrandCompetitorDomainCommand, UpdateBrandCompetitorDomainResult>
{
    private readonly IAppDbContext _db;

    public UpdateBrandCompetitorDomainCommandHandler(IAppDbContext db) => _db = db;

    public async Task<UpdateBrandCompetitorDomainResult> Handle(
        UpdateBrandCompetitorDomainCommand request, CancellationToken cancellationToken)
    {
        var competitor = await _db.Competitors
            .FirstOrDefaultAsync(c => c.Id == request.CompetitorId, cancellationToken)
            ?? throw new InvalidOperationException($"Competitor {request.CompetitorId} not found.");

        if (competitor.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Competitor {request.CompetitorId} does not belong to brand {request.BrandId}.");

        var normalized = NormalizeDomain(request.Domain);
        competitor.Domain = normalized;
        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateBrandCompetitorDomainResult(normalized);
    }

    /// <summary>
    /// Mirrors <c>SignalExtractor.NormalizeDomain</c> — citation
    /// classification reads the persisted value and re-normalizes
    /// host-only, so we store the same shape. Returns null when the
    /// input is empty or fails to parse as a hostname.
    /// </summary>
    private static string? NormalizeDomain(string? urlOrDomain)
    {
        if (string.IsNullOrWhiteSpace(urlOrDomain)) return null;
        var s = urlOrDomain.Trim();
        if (!s.Contains("://", StringComparison.Ordinal))
        {
            s = "https://" + s;
        }
        if (!Uri.TryCreate(s, UriKind.Absolute, out var uri) || string.IsNullOrEmpty(uri.Host))
        {
            throw new InvalidOperationException(
                $"Domain '{urlOrDomain}' is not a parseable hostname or URL.");
        }
        var host = uri.Host.ToLowerInvariant();
        return host.StartsWith("www.", StringComparison.Ordinal) ? host[4..] : host;
    }
}
