using AIVisibility.Api.DTOs;
using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Application.Queries.Trackers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

[ApiController]
[Route("api/trackers/{trackerId:guid}/schedule")]
public class TrackerScheduleController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackerScheduleController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(TrackerScheduleSetupDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid trackerId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetTrackerScheduleSetupQuery(trackerId), cancellationToken);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpPut]
    [ProducesResponseType(typeof(ConfigureTrackerScheduleResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Configure(
        Guid trackerId,
        [FromBody] ConfigureTrackerScheduleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new ConfigureTrackerScheduleCommand(trackerId, request.PlatformIds, request.Cadence, request.Timezone),
            cancellationToken);
        return Ok(result);
    }
}
