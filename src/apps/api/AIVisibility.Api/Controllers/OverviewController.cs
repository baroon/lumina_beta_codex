using AIVisibility.Application.Queries.Overview;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Phase 4 v3 Slice A — workspace-scoped overview endpoint. Returns the
/// hero counts + per-entity trend series + Top Entities table aggregated
/// across every TrackerConfiguration owned by the current workspace's
/// Brands. Slices B (competitive) and C (depth) layer in further
/// sections on sibling endpoints.
/// </summary>
[ApiController]
[Route("api/overview")]
public class OverviewController : ControllerBase
{
    private readonly IMediator _mediator;

    public OverviewController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(WorkspaceOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery(Name = "lensCodes")] string[]? lensCodes = null,
        [FromQuery(Name = "topicNames")] string[]? topicNames = null,
        [FromQuery(Name = "productNames")] string[]? productNames = null,
        [FromQuery(Name = "marketNames")] string[]? marketNames = null,
        [FromQuery(Name = "audienceNames")] string[]? audienceNames = null,
        [FromQuery(Name = "trackerIds")] Guid[]? trackerIds = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetWorkspaceOverviewQuery(from, to, lensCodes, topicNames, productNames, marketNames, audienceNames, trackerIds), cancellationToken);
        return Ok(result);
    }
}
