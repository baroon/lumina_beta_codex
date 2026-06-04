using AIVisibility.Application.Queries.Claims;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Scan-scoped factual-claims listing (Phase 4 measurement-model
/// expansion, item #14). Pivots <see cref="Domain.Entities.FactualClaim"/>
/// rows for one scan + optional review-status filter so the FE can split
/// "Pending review" from "All claims" without two queries.
/// </summary>
[ApiController]
[Route("api/scans/{scanRunId:guid}/claims")]
public class ScanClaimsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ScanClaimsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ScanClaimsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(
        Guid scanRunId,
        [FromQuery] string? reviewStatus,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetScanClaimsQuery(scanRunId, reviewStatus), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
