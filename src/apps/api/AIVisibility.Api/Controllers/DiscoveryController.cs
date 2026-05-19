using AIVisibility.Api.DTOs;
using AIVisibility.Application.Commands.Discovery;
using AIVisibility.Application.Queries.Discovery;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

[ApiController]
[Route("api/brands/{brandId:guid}/discovery")]
public class DiscoveryController : ControllerBase
{
    private readonly IMediator _mediator;

    public DiscoveryController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(DiscoveryResultsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDiscoveryResults(Guid brandId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDiscoveryResultsQuery(brandId), cancellationToken);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpPost("confirm")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConfirmDiscovery(Guid brandId, [FromBody] ConfirmDiscoveryRequest request, CancellationToken cancellationToken)
    {
        var command = new ConfirmDiscoveryCommand(brandId, request.ConfirmedIds, request.DismissedIds);
        await _mediator.Send(command, cancellationToken);
        return NoContent();
    }

    [HttpPost("resuggest")]
    [ProducesResponseType(typeof(ResuggestResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Resuggest(Guid brandId, [FromBody] ResuggestRequest request, CancellationToken cancellationToken)
    {
        var command = new ResuggestCommand(
            brandId,
            request.Industry,
            request.Category,
            request.Products,
            request.Audiences,
            request.Markets);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }
}
