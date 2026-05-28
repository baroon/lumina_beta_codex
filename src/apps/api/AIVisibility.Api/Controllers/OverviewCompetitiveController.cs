using AIVisibility.Application.Queries.Overview;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Phase 4 v3 Slice B — workspace competitive intelligence endpoint.
/// Returns top citation domains, domain types, mention distribution,
/// per-tracked-brand competitive gap groups, and per-entity
/// recommendation rates aggregated across the workspace.
/// </summary>
[ApiController]
[Route("api/overview/competitive")]
public class OverviewCompetitiveController : ControllerBase
{
    private readonly IMediator _mediator;

    public OverviewCompetitiveController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(WorkspaceCompetitiveDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetWorkspaceCompetitiveQuery(days), cancellationToken);
        return Ok(result);
    }
}
