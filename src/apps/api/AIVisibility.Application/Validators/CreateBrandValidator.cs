using AIVisibility.Application.Commands.Brands;
using FluentValidation;

namespace AIVisibility.Application.Validators;

public class CreateBrandValidator : AbstractValidator<CreateBrandCommand>
{
    public CreateBrandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Brand name is required")
            .MaximumLength(200).WithMessage("Brand name must not exceed 200 characters");

        RuleFor(x => x.WebsiteUrl)
            .NotEmpty().WithMessage("Website URL is required")
            .Must(BeAValidUrl).WithMessage("Website URL must be a valid URL");
    }

    private static bool BeAValidUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
