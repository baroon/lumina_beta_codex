using AIVisibility.Application.Queries.Scans;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Scan results read API for the Scan Results page (REQ-004 / KANBAN-004).
/// Scan-scoped, not tracker-scoped — the frontend has the scan id directly
/// after a trigger or from the tracker's recent-scans list, so /api/scans/
/// is the natural route base.
/// </summary>
[ApiController]
[Route("api/scans/{scanRunId:guid}/results")]
public class ScanResultsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ScanResultsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ScanResultsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid scanRunId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetScanResultsQuery(scanRunId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
