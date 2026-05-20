using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;

namespace AIVisibility.Application.Commands.Discovery;

public class ResuggestCommandHandler : IRequestHandler<ResuggestCommand, ResuggestResultDto>
{
    private readonly IResuggestService _resuggestService;
    private readonly IAppDbContext _db;

    public ResuggestCommandHandler(IResuggestService resuggestService, IAppDbContext db)
    {
        _resuggestService = resuggestService;
        _db = db;
    }

    public async Task<ResuggestResultDto> Handle(ResuggestCommand request, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands.FindAsync(new object[] { request.BrandId }, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found");

        var context = new ResuggestContext(
            BrandName: brand.Name,
            Industry: request.Industry,
            Category: request.Category,
            Products: request.Products,
            Audiences: request.Audiences,
            Markets: request.Markets,
            Topics: request.Topics,
            Competitors: request.Competitors,
            TrustSignals: request.TrustSignals);

        var result = await _resuggestService.ResuggestAsync(context, cancellationToken);

        return new ResuggestResultDto(
            Competitors: result.Competitors.Select(c => new ResuggestCandidateDto(
                Name: c.Name,
                Description: c.Description,
                Confidence: c.Confidence,
                Source: c.Source.ToString(),
                Metadata: new Dictionary<string, object?>
                {
                    ["domain"] = c.Domain
                }
            )).ToList(),
            Topics: result.Topics.Select(t => new ResuggestCandidateDto(
                Name: t.Name,
                Description: t.Description,
                Confidence: t.Confidence,
                Source: t.Source.ToString(),
                Metadata: new Dictionary<string, object?>()
            )).ToList()
        );
    }
}
