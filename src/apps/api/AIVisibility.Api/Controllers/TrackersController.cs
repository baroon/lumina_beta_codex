using AIVisibility.Api.DTOs;
using AIVisibility.Application.Commands.Trackers;
using AIVisibility.Application.Queries.Trackers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

[ApiController]
[Route("api/brands/{brandId:guid}/trackers")]
public class TrackersController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("setup-preview")]
    [ProducesResponseType(typeof(TrackerSetupPreviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSetupPreview(Guid brandId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetTrackerSetupPreviewQuery(brandId), cancellationToken);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpPost]
    [ProducesResponseType(typeof(CreateTrackerResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        Guid brandId,
        [FromBody] CreateTrackerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new CreateTrackerCommand(brandId, request.Name), cancellationToken);
        return CreatedAtAction(nameof(GetSetupPreview), new { brandId }, result);
    }
}
