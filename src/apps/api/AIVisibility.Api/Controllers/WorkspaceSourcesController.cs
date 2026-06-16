using AIVisibility.Application.Queries.Sources;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Workspace-wide source/citation aggregates at /api/sources/*. Sibling
/// to the per-scan source endpoint at /api/scans/{id}/sources — the
/// workspace endpoint aggregates citations across every tracker in the
/// workspace (subject to the optional `trackerIds` filter that the
/// sidebar TrackerSelector drives).
///
/// v1 ships the /domains rollup; /urls is a follow-up using the same
/// pattern at URL granularity (joins through `SourceUrl`).
/// </summary>
[ApiController]
[Route("api/sources")]
public class WorkspaceSourcesController : ControllerBase
{
    private readonly IMediator _mediator;

    public WorkspaceSourcesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("domains")]
    [ProducesResponseType(typeof(WorkspaceDomainsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Domains(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery(Name = "trackerIds")] Guid[]? trackerIds = null,
        [FromQuery(Name = "lensCodes")] string[]? lensCodes = null,
        [FromQuery(Name = "topicNames")] string[]? topicNames = null,
        [FromQuery(Name = "productNames")] string[]? productNames = null,
        [FromQuery(Name = "marketNames")] string[]? marketNames = null,
        [FromQuery(Name = "audienceNames")] string[]? audienceNames = null,
        [FromQuery(Name = "sentimentValues")] string[]? sentimentValues = null,
        [FromQuery(Name = "platformCodes")] string[]? platformCodes = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetWorkspaceDomainsQuery(
                from, to, trackerIds,
                lensCodes, topicNames, productNames, marketNames, audienceNames,
                sentimentValues, platformCodes),
            cancellationToken);
        return Ok(result);
    }

    [HttpGet("urls")]
    [ProducesResponseType(typeof(WorkspaceUrlsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Urls(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery(Name = "trackerIds")] Guid[]? trackerIds = null,
        [FromQuery(Name = "lensCodes")] string[]? lensCodes = null,
        [FromQuery(Name = "topicNames")] string[]? topicNames = null,
        [FromQuery(Name = "productNames")] string[]? productNames = null,
        [FromQuery(Name = "marketNames")] string[]? marketNames = null,
        [FromQuery(Name = "audienceNames")] string[]? audienceNames = null,
        [FromQuery(Name = "sentimentValues")] string[]? sentimentValues = null,
        [FromQuery(Name = "platformCodes")] string[]? platformCodes = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetWorkspaceUrlsQuery(
                from, to, trackerIds,
                lensCodes, topicNames, productNames, marketNames, audienceNames,
                sentimentValues, platformCodes),
            cancellationToken);
        return Ok(result);
    }
}
