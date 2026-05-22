using AIVisibility.Application.Commands.Prompts;
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

    [HttpPost("generate")]
    [ProducesResponseType(typeof(GeneratePromptsResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Generate(Guid trackerId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GeneratePromptsCommand(trackerId), cancellationToken);
        return Ok(result);
    }
}
