using AIVisibility.Application.Commands.Brands;
using AIVisibility.Application.Validators;
using FluentAssertions;

namespace AIVisibility.Tests.Unit.Application;

public class CreateBrandValidatorTests
{
    private readonly CreateBrandValidator _validator = new();

    [Fact]
    public void ShouldPass_WhenValidInput()
    {
        var command = new CreateBrandCommand("Test Brand", "https://example.com", Guid.NewGuid());
        var result = _validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void ShouldFail_WhenNameIsEmpty()
    {
        var command = new CreateBrandCommand("", "https://example.com", Guid.NewGuid());
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Name");
    }

    [Fact]
    public void ShouldFail_WhenNameExceeds200Characters()
    {
        var command = new CreateBrandCommand(new string('a', 201), "https://example.com", Guid.NewGuid());
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Name");
    }

    [Fact]
    public void ShouldFail_WhenUrlIsEmpty()
    {
        var command = new CreateBrandCommand("Test Brand", "", Guid.NewGuid());
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "WebsiteUrl");
    }

    [Fact]
    public void ShouldFail_WhenUrlIsInvalid()
    {
        var command = new CreateBrandCommand("Test Brand", "not-a-url", Guid.NewGuid());
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "WebsiteUrl");
    }

    [Fact]
    public void ShouldPass_WhenUrlIsHttp()
    {
        var command = new CreateBrandCommand("Test Brand", "http://example.com", Guid.NewGuid());
        var result = _validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }
}
