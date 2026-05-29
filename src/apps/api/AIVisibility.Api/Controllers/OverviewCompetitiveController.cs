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
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery(Name = "lensCodes")] string[]? lensCodes = null,
        [FromQuery(Name = "topicNames")] string[]? topicNames = null,
        [FromQuery(Name = "productNames")] string[]? productNames = null,
        [FromQuery(Name = "marketNames")] string[]? marketNames = null,
        [FromQuery(Name = "audienceNames")] string[]? audienceNames = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetWorkspaceCompetitiveQuery(from, to, lensCodes, topicNames, productNames, marketNames, audienceNames), cancellationToken);
        return Ok(result);
    }
}
