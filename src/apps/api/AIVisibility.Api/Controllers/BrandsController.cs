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

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(BrandDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBrand(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBrandQuery(id), cancellationToken);
        return result != null ? Ok(result) : NotFound();
    }
}
