using AIVisibility.Api.DTOs;
using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Application.Queries.Trackers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

[ApiController]
[Route("api/trackers/{trackerId:guid}/lenses")]
public class TrackerLensesController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackerLensesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    [ProducesResponseType(typeof(TrackerLensesSetupDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid trackerId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetTrackerLensesQuery(trackerId), cancellationToken);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpPut]
    [ProducesResponseType(typeof(UpdateTrackerLensesResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(
        Guid trackerId,
        [FromBody] UpdateTrackerLensesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new UpdateTrackerLensesCommand(trackerId, request.LensIds),
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
