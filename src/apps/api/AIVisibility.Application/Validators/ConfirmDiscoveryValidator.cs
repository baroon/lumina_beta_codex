using AIVisibility.Application.Commands.Discovery;
using FluentValidation;

namespace AIVisibility.Application.Validators;

public class ConfirmDiscoveryValidator : AbstractValidator<ConfirmDiscoveryCommand>
{
    public ConfirmDiscoveryValidator()
    {
        RuleFor(x => x.BrandId).NotEmpty().WithMessage("Brand ID is required");
    }
}
