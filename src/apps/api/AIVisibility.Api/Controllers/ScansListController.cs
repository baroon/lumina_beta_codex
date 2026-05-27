using AIVisibility.Application.Queries.Scans;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Cross-tracker scan list (GET /api/scans). Temporary navigation utility
/// for the /scans frontend page so users can browse recent scans without
/// knowing IDs. Pagination + filtering land if/when this becomes a real
/// feature; for now the handler caps at 100 rows ordered by startedAt DESC.
///
/// Separate from <see cref="ScanResultsController"/> (which owns
/// <c>/api/scans/{id}/results</c>) and from the tracker-scoped
/// <c>ScansController</c> (which owns
/// <c>/api/trackers/{trackerId}/scans</c>) to keep each controller's route
/// constraint coherent.
/// </summary>
[ApiController]
[Route("api/scans")]
public class ScansListController : ControllerBase
{
    private readonly IMediator _mediator;

    public ScansListController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ScanListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAllScansQuery(), cancellationToken);
        return Ok(result);
    }
}
