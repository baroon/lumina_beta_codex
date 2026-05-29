using AIVisibility.Application.Queries.Overview;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Discovery-summary endpoint — drives the inline "Tracking N products ·
/// M markets · …" strip at the top of the Workspace Overview. Returns
/// counts plus names for products, markets, audiences, topics, and
/// trust signals captured during the brand-discovery flow. Workspace-
/// scoped; no filters.
/// </summary>
[ApiController]
[Route("api/overview/discovery-summary")]
public class OverviewDiscoverySummaryController : ControllerBase
{
    private readonly IMediator _mediator;

    public OverviewDiscoverySummaryController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(DiscoverySummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetWorkspaceDiscoverySummaryQuery(), cancellationToken);
        return Ok(result);
    }
}
