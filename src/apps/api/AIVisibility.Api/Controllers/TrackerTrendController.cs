using AIVisibility.Application.Queries.Trackers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Tracker dashboard trend endpoint (Phase 4 Slice 6). Returns one trend
/// series per dashboard metric for the given tracker within a rolling window.
/// </summary>
[ApiController]
[Route("api/trackers/{trackerId:guid}/trend")]
public class TrackerTrendController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackerTrendController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(TrackerTrendDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        Guid trackerId,
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetTrackerTrendQuery(trackerId, days), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
