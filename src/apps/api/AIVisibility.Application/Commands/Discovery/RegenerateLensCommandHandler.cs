using AIVisibility.Application.Interfaces;
using MediatR;

namespace AIVisibility.Application.Commands.Discovery;

public class RegenerateLensCommandHandler : IRequestHandler<RegenerateLensCommand, RegenerateLensResultDto>
{
    private readonly IResuggestService _resuggestService;
    private readonly IAppDbContext _db;

    public RegenerateLensCommandHandler(IResuggestService resuggestService, IAppDbContext db)
    {
        _resuggestService = resuggestService;
        _db = db;
    }

    public async Task<RegenerateLensResultDto> Handle(RegenerateLensCommand request, CancellationToken cancellationToken)
    {
        var brand = await _db.Brands.FindAsync(new object[] { request.BrandId }, cancellationToken)
            ?? throw new InvalidOperationException($"Brand {request.BrandId} not found");

        var context = new ResuggestContext(
            BrandName: brand.Name,
            Industry: request.Industry,
            Category: request.Category,
            Products: request.Products,
            Audiences: request.Audiences,
            Markets: request.Markets);

        var result = await _resuggestService.RegenerateLensAsync(context, request.Lens, cancellationToken);

        return new RegenerateLensResultDto(
            Lens: request.Lens,
            Candidates: result.Candidates.Select(c => new ResuggestCandidateDto(
                Name: c.Name,
                Description: c.Description,
                Confidence: c.Confidence,
                Source: c.Source,
                Metadata: c.Metadata
            )).ToList()
        );
    }
}
