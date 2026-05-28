using AIVisibility.Application.Queries.Trackers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Tracker dashboard consolidated endpoint (Phase 4 v2 Slice A). Returns
/// the whole dashboard read model — hero counts + per-entity trend series
/// + top brands table — in a single round trip so the frontend doesn't
/// fan out N parallel requests on every page load.
/// </summary>
[ApiController]
[Route("api/trackers/{trackerId:guid}/dashboard")]
public class TrackerDashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackerDashboardController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(TrackerDashboardDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        Guid trackerId,
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetTrackerDashboardQuery(trackerId, days), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
