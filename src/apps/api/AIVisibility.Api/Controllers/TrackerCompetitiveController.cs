using AIVisibility.Application.Queries.Trackers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Tracker dashboard v2 — Slice B competitive intelligence endpoint.
/// Returns the sources/domains/SoV/mention distribution/gap analysis
/// sections of the dashboard, separately from the hero/trend/top-brands
/// payload from <see cref="TrackerDashboardController"/> so neither
/// payload becomes a god-object as the dashboard grows.
/// </summary>
[ApiController]
[Route("api/trackers/{trackerId:guid}/dashboard/competitive")]
public class TrackerCompetitiveController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackerCompetitiveController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(TrackerCompetitiveDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        Guid trackerId,
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetTrackerCompetitiveQuery(trackerId, days), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
