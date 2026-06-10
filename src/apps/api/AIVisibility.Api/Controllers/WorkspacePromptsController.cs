using AIVisibility.Application.Queries.Prompts;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Workspace-wide prompt inventory at /api/prompts. Distinct from the
/// existing per-tracker PromptsController (/api/trackers/{id}/prompts)
/// because the new IA's /prompts page aggregates across every tracker in
/// the workspace (subject to the optional `trackerIds` filter that the
/// sidebar TrackerSelector drives).
/// </summary>
[ApiController]
[Route("api/prompts")]
public class WorkspacePromptsController : ControllerBase
{
    private readonly IMediator _mediator;

    public WorkspacePromptsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(WorkspacePromptsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery(Name = "trackerIds")] Guid[]? trackerIds = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetWorkspacePromptsQuery(from, to, trackerIds), cancellationToken);
        return Ok(result);
    }
}
