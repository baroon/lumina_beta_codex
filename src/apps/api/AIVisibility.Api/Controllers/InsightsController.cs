using AIVisibility.Api.DTOs;
using AIVisibility.Application.Queries.Insights;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

[ApiController]
[Route("api/insights")]
public class InsightsController : ControllerBase
{
    private readonly IMediator _mediator;

    public InsightsController(IMediator mediator) => _mediator = mediator;

    [HttpPost("narrative")]
    [ProducesResponseType(typeof(InsightsNarrativeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Narrative(
        [FromBody] GenerateInsightsNarrativeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new GenerateInsightsNarrativeQuery(request.From, request.To, request.TrackerIds),
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
