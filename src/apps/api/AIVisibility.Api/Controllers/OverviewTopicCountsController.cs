using AIVisibility.Application.Queries.Overview;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Per-topic mention counts. Drives the inline count chip next to each
/// row of the topic dropdown on the Workspace Overview so the user can
/// see which topics carry data before toggling. Returned counts are
/// scoped to the workspace + window only — NOT to the active topic
/// filter — so they stay stable as the user clicks around. Mirrors
/// /api/overview/lens-counts.
/// </summary>
[ApiController]
[Route("api/overview/topic-counts")]
public class OverviewTopicCountsController : ControllerBase
{
    private readonly IMediator _mediator;

    public OverviewTopicCountsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TopicCountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetTopicCountsQuery(from, to), cancellationToken);
        return Ok(result);
    }
}
