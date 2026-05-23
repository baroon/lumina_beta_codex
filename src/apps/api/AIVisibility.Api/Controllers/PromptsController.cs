using AIVisibility.Application.Commands.Prompts;
using AIVisibility.Application.Queries.Prompts;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

[ApiController]
[Route("api/trackers/{trackerId:guid}/prompts")]
public class PromptsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PromptsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PromptListDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(Guid trackerId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ListPromptsQuery(trackerId), cancellationToken);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpPost("generate")]
    [ProducesResponseType(typeof(GeneratePromptsResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Generate(Guid trackerId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GeneratePromptsCommand(trackerId), cancellationToken);
        return Ok(result);
    }

    [HttpPost("confirm")]
    [ProducesResponseType(typeof(ConfirmPromptsResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Confirm(Guid trackerId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ConfirmPromptsCommand(trackerId), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{promptId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remove(Guid trackerId, Guid promptId, CancellationToken cancellationToken)
    {
        await _mediator.Send(new RemovePromptCommand(trackerId, promptId), cancellationToken);
        return NoContent();
    }
}
