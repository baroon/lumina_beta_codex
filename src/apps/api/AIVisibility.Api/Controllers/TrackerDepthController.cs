using AIVisibility.Application.Queries.Trackers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Tracker dashboard v2 — Slice C platform/topic depth + recent chats
/// endpoint. Returns per-platform brand metrics, sentiment distribution,
/// activity + topic heatmaps, and the last N AIAnswers projection.
/// Separated from <see cref="TrackerDashboardController"/> and
/// <see cref="TrackerCompetitiveController"/> so each section payload
/// stays scoped.
/// </summary>
[ApiController]
[Route("api/trackers/{trackerId:guid}/dashboard/depth")]
public class TrackerDepthController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackerDepthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(TrackerDepthDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        Guid trackerId,
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetTrackerDepthQuery(trackerId, days), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
