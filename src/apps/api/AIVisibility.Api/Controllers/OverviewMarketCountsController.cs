using AIVisibility.Application.Queries.Overview;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Per-market mention counts. Drives the inline count chip next to each
/// row of the market dropdown on the Workspace Overview so the user can
/// see which markets carry data before toggling. Counts are scoped to
/// the workspace + window only — NOT to the active market filter — so
/// they stay stable as the user clicks around.
/// </summary>
[ApiController]
[Route("api/overview/market-counts")]
public class OverviewMarketCountsController : ControllerBase
{
    private readonly IMediator _mediator;

    public OverviewMarketCountsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MarketCountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetMarketCountsQuery(from, to), cancellationToken);
        return Ok(result);
    }
}
