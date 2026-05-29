using AIVisibility.Application.Queries.Overview;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Per-audience mention counts for the Workspace Overview audience pill.
/// Workspace + window scoped, deliberately unfiltered by the active
/// audience selection. Mirrors /api/overview/topic-counts.
/// </summary>
[ApiController]
[Route("api/overview/audience-counts")]
public class OverviewAudienceCountsController : ControllerBase
{
    private readonly IMediator _mediator;

    public OverviewAudienceCountsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AudienceCountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetAudienceCountsQuery(from, to), cancellationToken);
        return Ok(result);
    }
}
