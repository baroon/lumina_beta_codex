using AIVisibility.Application.Queries.Topics;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

/// <summary>
/// Scan-scoped topic reporting (Phase 4 v1 plan §Slice 3). List endpoint
/// pivots pre-computed Topic-scope ScanMetric rows; detail endpoint adds
/// a runtime Topic×Platform sub-aggregation + top cited sources within
/// the topic.
/// </summary>
[ApiController]
[Route("api/scans/{scanRunId:guid}/topics")]
public class ScanTopicsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ScanTopicsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ScanTopicsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(Guid scanRunId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetScanTopicsQuery(scanRunId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{topicId:guid}")]
    [ProducesResponseType(typeof(ScanTopicDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Detail(Guid scanRunId, Guid topicId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetScanTopicQuery(scanRunId, topicId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
