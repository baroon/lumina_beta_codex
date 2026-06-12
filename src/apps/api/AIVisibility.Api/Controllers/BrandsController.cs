using AIVisibility.Api.DTOs;
using AIVisibility.Application.Commands.Brands;
using AIVisibility.Application.Queries.Brands;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AIVisibility.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BrandsController : ControllerBase
{
    private readonly IMediator _mediator;

    public BrandsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [ProducesResponseType(typeof(CreateBrandResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBrand([FromBody] CreateBrandRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateBrandCommand(
            request.Name,
            request.WebsiteUrl,
            Guid.Empty);

        var result = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetBrand), new { id = result.BrandId }, result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<BrandDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListBrands(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ListBrandsQuery(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(BrandDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBrand(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBrandQuery(id), cancellationToken);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            await _mediator.Send(new DeleteBrandCommand(id), cancellationToken);
            return NoContent();
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

    [HttpPut("{id:guid}/name")]
    [ProducesResponseType(typeof(RenameBrandResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Rename(
        Guid id,
        [FromBody] RenameBrandRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new RenameBrandCommand(id, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (DuplicateBrandNameException ex)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Duplicate brand name",
                Detail = ex.Message,
                Status = StatusCodes.Status409Conflict,
            });
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

    [HttpPut("{id:guid}/website-url")]
    [ProducesResponseType(typeof(UpdateBrandWebsiteUrlResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateWebsiteUrl(
        Guid id,
        [FromBody] UpdateBrandWebsiteUrlRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new UpdateBrandWebsiteUrlCommand(id, request.WebsiteUrl), cancellationToken);
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

    [HttpPut("{id:guid}/aliases")]
    [ProducesResponseType(typeof(UpdateBrandAliasesResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAliases(
        Guid id,
        [FromBody] UpdateBrandAliasesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new UpdateBrandAliasesCommand(id, request.Aliases),
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/topics")]
    [ProducesResponseType(typeof(AddBrandTopicResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddTopic(
        Guid id,
        [FromBody] AddBrandTopicRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new AddBrandTopicCommand(id, request.Name),
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/topics/{topicId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveTopic(
        Guid id,
        Guid topicId,
        CancellationToken cancellationToken)
    {
        try
        {
            await _mediator.Send(new RemoveBrandTopicCommand(id, topicId), cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/competitors")]
    [ProducesResponseType(typeof(AddBrandCompetitorResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddCompetitor(
        Guid id,
        [FromBody] AddBrandCompetitorRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new AddBrandCompetitorCommand(id, request.Name),
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/competitors/{competitorId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveCompetitor(
        Guid id,
        Guid competitorId,
        CancellationToken cancellationToken)
    {
        try
        {
            await _mediator.Send(
                new RemoveBrandCompetitorCommand(id, competitorId),
                cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/audiences")]
    [ProducesResponseType(typeof(AddBrandAudienceResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddAudience(
        Guid id, [FromBody] AddBrandAudienceRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new AddBrandAudienceCommand(id, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/audiences/{audienceId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemoveAudience(
        Guid id, Guid audienceId, CancellationToken cancellationToken)
    {
        try
        {
            await _mediator.Send(
                new RemoveBrandAudienceCommand(id, audienceId), cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/markets")]
    [ProducesResponseType(typeof(AddBrandMarketResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddMarket(
        Guid id, [FromBody] AddBrandMarketRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new AddBrandMarketCommand(id, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/markets/{marketId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemoveMarket(
        Guid id, Guid marketId, CancellationToken cancellationToken)
    {
        try
        {
            await _mediator.Send(
                new RemoveBrandMarketCommand(id, marketId), cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/products")]
    [ProducesResponseType(typeof(AddBrandProductResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddProduct(
        Guid id, [FromBody] AddBrandProductRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new AddBrandProductCommand(id, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/products/{productId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemoveProduct(
        Guid id, Guid productId, CancellationToken cancellationToken)
    {
        try
        {
            await _mediator.Send(
                new RemoveBrandProductCommand(id, productId), cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/trust-signals")]
    [ProducesResponseType(typeof(AddBrandTrustSignalResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddTrustSignal(
        Guid id,
        [FromBody] AddBrandTrustSignalRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new AddBrandTrustSignalCommand(id, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/trust-signals/{trustSignalId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemoveTrustSignal(
        Guid id, Guid trustSignalId, CancellationToken cancellationToken)
    {
        try
        {
            await _mediator.Send(
                new RemoveBrandTrustSignalCommand(id, trustSignalId), cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // -----------------------------------------------------------------
    // Dimension rename endpoints — chip click-to-edit on the FE. All
    // six handlers share the same shape, so the controller actions are
    // intentionally near-identical wrappers around their MediatR commands.
    // -----------------------------------------------------------------

    [HttpPut("{id:guid}/topics/{topicId:guid}")]
    [ProducesResponseType(typeof(RenameBrandTopicResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RenameTopic(
        Guid id, Guid topicId,
        [FromBody] RenameBrandDimensionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new RenameBrandTopicCommand(id, topicId, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}/competitors/{competitorId:guid}")]
    [ProducesResponseType(typeof(RenameBrandCompetitorResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RenameCompetitor(
        Guid id, Guid competitorId,
        [FromBody] RenameBrandDimensionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new RenameBrandCompetitorCommand(id, competitorId, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}/competitors/{competitorId:guid}/aliases")]
    [ProducesResponseType(typeof(UpdateBrandCompetitorAliasesResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCompetitorAliases(
        Guid id, Guid competitorId,
        [FromBody] UpdateBrandCompetitorAliasesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new UpdateBrandCompetitorAliasesCommand(id, competitorId, request.Aliases),
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

    [HttpPut("{id:guid}/competitors/{competitorId:guid}/domain")]
    [ProducesResponseType(typeof(UpdateBrandCompetitorDomainResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCompetitorDomain(
        Guid id, Guid competitorId,
        [FromBody] UpdateBrandCompetitorDomainRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new UpdateBrandCompetitorDomainCommand(id, competitorId, request.Domain),
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

    [HttpPut("{id:guid}/competitors/{competitorId:guid}/description")]
    [ProducesResponseType(typeof(UpdateBrandCompetitorDescriptionResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCompetitorDescription(
        Guid id, Guid competitorId,
        [FromBody] UpdateBrandCompetitorDescriptionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new UpdateBrandCompetitorDescriptionCommand(id, competitorId, request.Description),
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

    [HttpPut("{id:guid}/audiences/{audienceId:guid}")]
    [ProducesResponseType(typeof(RenameBrandAudienceResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RenameAudience(
        Guid id, Guid audienceId,
        [FromBody] RenameBrandDimensionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new RenameBrandAudienceCommand(id, audienceId, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}/markets/{marketId:guid}")]
    [ProducesResponseType(typeof(RenameBrandMarketResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RenameMarket(
        Guid id, Guid marketId,
        [FromBody] RenameBrandDimensionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new RenameBrandMarketCommand(id, marketId, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}/products/{productId:guid}")]
    [ProducesResponseType(typeof(RenameBrandProductResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RenameProduct(
        Guid id, Guid productId,
        [FromBody] RenameBrandDimensionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new RenameBrandProductCommand(id, productId, request.Name), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}/products/{productId:guid}/aliases")]
    [ProducesResponseType(typeof(UpdateBrandProductAliasesResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProductAliases(
        Guid id, Guid productId,
        [FromBody] UpdateBrandProductAliasesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new UpdateBrandProductAliasesCommand(id, productId, request.Aliases),
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

    [HttpPut("{id:guid}/trust-signals/{trustSignalId:guid}")]
    [ProducesResponseType(typeof(RenameBrandTrustSignalResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RenameTrustSignal(
        Guid id, Guid trustSignalId,
        [FromBody] RenameBrandDimensionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new RenameBrandTrustSignalCommand(id, trustSignalId, request.Name),
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}/profile")]
    [ProducesResponseType(typeof(UpdateBrandProfileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile(
        Guid id,
        [FromBody] UpdateBrandProfileRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mediator.Send(
                new UpdateBrandProfileCommand(
                    id,
                    request.ShortDescription,
                    request.Industry,
                    request.Category,
                    request.Positioning),
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
