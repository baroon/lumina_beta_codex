using AIVisibility.Application.Queries.Overview;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Phase 4 v3 Slice C — workspace platform/topic depth + recent chats
/// endpoint. Returns per-platform brand metrics, sentiment distribution,
/// activity + topic heatmaps, and the last N AIAnswers across the
/// workspace (with tracker + brand context).
/// </summary>
[ApiController]
[Route("api/overview/depth")]
public class OverviewDepthController : ControllerBase
{
    private readonly IMediator _mediator;

    public OverviewDepthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(WorkspaceDepthDto), StatusCodes.Status200OK)]
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
            new GetWorkspaceDepthQuery(from, to, lensCodes, topicNames, productNames, marketNames, audienceNames, trackerIds), cancellationToken);
        return Ok(result);
    }
}
