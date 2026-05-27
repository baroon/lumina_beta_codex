using AIVisibility.Application.Queries.SourceTypes;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Static reference data for the 12-value SourceType taxonomy. Frontend
/// caches the response and uses it to populate the editable dropdown on the
/// Source/Citation view (Phase 4 v1 plan §D12 / §D20).
/// </summary>
[ApiController]
[Route("api/source-types")]
public class SourceTypesController : ControllerBase
{
    private readonly IMediator _mediator;

    public SourceTypesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SourceTypeReferenceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetSourceTypesQuery(), cancellationToken);
        return Ok(result);
    }
}
