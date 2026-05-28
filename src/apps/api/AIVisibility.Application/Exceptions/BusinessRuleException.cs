namespace AIVisibility.Application.Exceptions;

/// <summary>
/// Thrown when a command violates a domain / business rule (e.g. an
/// on-demand tracker run attempt within the 24h cooldown). Distinct
/// from <see cref="InvalidOperationException"/>, which the API filter
/// maps to 404 Not Found — business-rule violations map to 409 Conflict.
/// </summary>
public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
}
