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

    /// <summary>
    /// Per-prompt answer history — drives the row-click drawer on
    /// /prompts. Authorization is workspace-scoped inside the handler:
    /// a prompt that doesn't belong to a tracker of a workspace brand
    /// returns an empty list (no 404, no enumeration leak).
    /// </summary>
    [HttpGet("{promptId:guid}/answers")]
    [ProducesResponseType(typeof(PromptAnswerHistoryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAnswerHistory(
        Guid promptId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetPromptAnswerHistoryQuery(promptId, from, to), cancellationToken);
        return Ok(result);
    }
}
