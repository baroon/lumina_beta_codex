using AIVisibility.Application.Queries.Trackers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Flat trackers listing across brands. Separate controller because the
/// existing <see cref="TrackersController"/> is brand-scoped at
/// /api/brands/{brandId}/trackers.
/// </summary>
[ApiController]
[Route("api/trackers")]
public class TrackersListController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackersListController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TrackerListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAllTrackersQuery(), cancellationToken);
        return Ok(result);
    }
}
