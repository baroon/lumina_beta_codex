namespace AIVisibility.Api.DTOs;

/// <summary>
/// Shared rename payload for any brand dimension row (topic, competitor,
/// audience, market, product, trust signal). Single record kept as DTO
/// for all six endpoints — the JSON shape is identical, so cloning the
/// DTO 6× just adds noise.
/// </summary>
public record RenameBrandDimensionRequest(string Name);
