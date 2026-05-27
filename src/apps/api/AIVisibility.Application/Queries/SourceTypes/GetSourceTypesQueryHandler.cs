using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Queries.SourceTypes;

public class GetSourceTypesQueryHandler : IRequestHandler<GetSourceTypesQuery, IReadOnlyList<SourceTypeReferenceDto>>
{
    private readonly IAppDbContext _db;

    public GetSourceTypesQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<SourceTypeReferenceDto>> Handle(
        GetSourceTypesQuery request, CancellationToken cancellationToken)
    {
        return await _db.SourceTypes.AsNoTracking()
            .OrderBy(t => t.DisplayOrder)
            .Select(t => new SourceTypeReferenceDto(t.Id, t.Code, t.Name, t.Description, t.DisplayOrder))
            .ToListAsync(cancellationToken);
    }
}
