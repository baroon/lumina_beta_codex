namespace AIVisibility.Api.DTOs;

/// <summary>
/// PUT /api/brands/{id}/trust-signals/{trustSignalId}/type body.
/// <see cref="SignalType"/> is the enum name (e.g.
/// "CertificationsAndAccreditations"); the controller parses it
/// case-insensitively and returns 400 if it doesn't match one of the
/// seven values.
/// </summary>
public record UpdateBrandTrustSignalTypeRequest(string SignalType);
