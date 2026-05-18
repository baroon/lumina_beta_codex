using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AIVisibility.Api.Filters;

public class ProblemDetailsExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ProblemDetailsExceptionFilter> _logger;

    public ProblemDetailsExceptionFilter(ILogger<ProblemDetailsExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        if (context.Exception is ValidationException validationException)
        {
            var errors = validationException.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(e => e.ErrorMessage).ToArray());

            var problemDetails = new ValidationProblemDetails(errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed",
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1"
            };

            context.Result = new BadRequestObjectResult(problemDetails);
            context.ExceptionHandled = true;
            return;
        }

        if (context.Exception is InvalidOperationException)
        {
            var problemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Resource not found",
                Detail = context.Exception.Message,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4"
            };

            context.Result = new NotFoundObjectResult(problemDetails);
            context.ExceptionHandled = true;
            return;
        }

        _logger.LogError(context.Exception, "Unhandled exception");
    }
}
