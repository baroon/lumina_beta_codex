using AIVisibility.Api.DTOs;
using AIVisibility.Application.Commands.FactualClaims;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

[ApiController]
[Route("api/factual-claims")]
public class FactualClaimsController : ControllerBase
{
    private readonly IMediator _mediator;

    public FactualClaimsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Sets the review status on a single factual claim. The only write
    /// action allowed on the otherwise append-only FactualClaim table —
    /// reviewers flip Pending → Verified / Disputed (and may revise
    /// back to Pending if they want to re-queue a claim). Workspace
    /// ownership is enforced in the handler.
    /// </summary>
    [HttpPut("{id:guid}/review-status")]
    [ProducesResponseType(typeof(UpdateFactualClaimReviewStatusResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateReviewStatus(
        Guid id,
        [FromBody] UpdateFactualClaimReviewStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<ClaimReviewStatus>(request.ReviewStatus, ignoreCase: true, out var parsed))
            return BadRequest(new
            {
                error = $"'{request.ReviewStatus}' is not a valid ClaimReviewStatus. " +
                    "Expected one of: " + string.Join(", ", Enum.GetNames<ClaimReviewStatus>()),
            });

        try
        {
            var result = await _mediator.Send(
                new UpdateFactualClaimReviewStatusCommand(id, parsed),
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
