using AIVisibility.Application.Queries.Sources;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Scan-scoped sources read API for the Source/Citation view (Phase 4 v1
/// plan §Slice 2). List of every source cited in the scan plus a per-source
/// drill-down endpoint for the side drawer (D15).
/// </summary>
[ApiController]
[Route("api/scans/{scanRunId:guid}/sources")]
public class ScanSourcesController : ControllerBase
{
    private readonly IMediator _mediator;

    public ScanSourcesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ScanSourcesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(Guid scanRunId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetScanSourcesQuery(scanRunId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{sourceId:guid}/citations")]
    [ProducesResponseType(typeof(ScanSourceCitationsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Citations(Guid scanRunId, Guid sourceId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetScanSourceCitationsQuery(scanRunId, sourceId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
