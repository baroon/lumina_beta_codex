using AIVisibility.Application.Queries.Overview;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Per-lens mention counts endpoint. Drives the count chip next to
/// each row of the lens dropdown on the Workspace Overview so the user
/// can see at-a-glance which lenses carry data before toggling. The
/// returned counts are deliberately scoped to the workspace + window
/// only — NOT to the active lens filter — so they stay stable as the
/// user clicks around.
/// </summary>
[ApiController]
[Route("api/overview/lens-counts")]
public class OverviewLensCountsController : ControllerBase
{
    private readonly IMediator _mediator;

    public OverviewLensCountsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<LensCountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetLensCountsQuery(from, to), cancellationToken);
        return Ok(result);
    }
}
