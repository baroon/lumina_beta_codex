using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Application.Queries.Trackers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Flat trackers endpoints not scoped to a brand. The brand-scoped
/// create + setup-preview endpoints stay on <see cref="TrackersController"/>;
/// list + delete operate on a known tracker ID directly.
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

    [HttpDelete("{trackerId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid trackerId, CancellationToken cancellationToken)
    {
        try
        {
            await _mediator.Send(new DeleteTrackerCommand(trackerId), cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
