using AIVisibility.Application.Commands.Sources;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Source-scoped write API (Phase 4 v1 plan §D11). Sources are cross-tracker
/// entities, so the correction endpoint lives at /api/sources/, not under
/// scans. Brand is supplied via query string because the classification is
/// per-(brand, source).
/// </summary>
[ApiController]
[Route("api/sources/{sourceId:guid}")]
public class SourcesController : ControllerBase
{
    private readonly IMediator _mediator;

    public SourcesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPut("classification")]
    [ProducesResponseType(typeof(UpdateSourceClassificationResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateClassification(
        Guid sourceId,
        [FromQuery] Guid brandId,
        [FromBody] UpdateClassificationRequest body,
        CancellationToken cancellationToken)
    {
        if (brandId == Guid.Empty)
        {
            return BadRequest(new { error = "brandId query parameter is required." });
        }
        if (!Enum.TryParse<SourceType>(body.SourceType, ignoreCase: true, out var parsedType))
        {
            return BadRequest(new { error = $"sourceType '{body.SourceType}' is not a valid SourceType." });
        }

        var result = await _mediator.Send(
            new UpdateSourceClassificationCommand(sourceId, brandId, parsedType),
            cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}

/// <summary>
/// Body of the PUT /api/sources/{sourceId}/classification request.
/// <see cref="SourceType"/> is the enum code (e.g. "Editorial") matching
/// <c>source_types.code</c>.
/// </summary>
public sealed record UpdateClassificationRequest(string SourceType);
