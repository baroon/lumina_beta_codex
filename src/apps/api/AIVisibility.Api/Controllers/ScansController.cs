using AIVisibility.Application.Commands.Scans;
using AIVisibility.Application.Queries.Scans;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

[ApiController]
[Route("api/trackers/{trackerId:guid}/scans")]
public class ScansController : ControllerBase
{
    private readonly IMediator _mediator;

    public ScansController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [ProducesResponseType(typeof(RunScanResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Run(Guid trackerId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RunScanCommand(trackerId), cancellationToken);
        return Ok(result);
    }

    [HttpGet("latest")]
    [ProducesResponseType(typeof(ScanStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Latest(Guid trackerId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetLatestScanQuery(trackerId), cancellationToken);
        return result != null ? Ok(result) : NotFound();
    }
}
