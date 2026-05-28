using AIVisibility.Application.Queries.Competitors;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Scan-scoped competitor reporting (Phase 4 v1 plan §Slice 4). List
/// endpoint pivots pre-computed Competitor-scope ScanMetric rows; detail
/// endpoint adds the set of sources cited on answers that mentioned this
/// competitor.
/// </summary>
[ApiController]
[Route("api/scans/{scanRunId:guid}/competitors")]
public class ScanCompetitorsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ScanCompetitorsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ScanCompetitorsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(Guid scanRunId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetScanCompetitorsQuery(scanRunId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{competitorId:guid}")]
    [ProducesResponseType(typeof(ScanCompetitorDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Detail(Guid scanRunId, Guid competitorId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetScanCompetitorQuery(scanRunId, competitorId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
