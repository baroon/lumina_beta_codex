using AIVisibility.Application.Queries.Overview;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Per-product mention counts. Drives the inline count chip next to
/// each row of the product dropdown on the Workspace Overview so the
/// user can see which products carry data before toggling. Returned
/// counts are scoped to the workspace + window only — NOT to the active
/// product filter — so they stay stable as the user clicks around.
/// Mirrors /api/overview/topic-counts.
/// </summary>
[ApiController]
[Route("api/overview/product-counts")]
public class OverviewProductCountsController : ControllerBase
{
    private readonly IMediator _mediator;

    public OverviewProductCountsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProductCountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetProductCountsQuery(from, to), cancellationToken);
        return Ok(result);
    }
}
