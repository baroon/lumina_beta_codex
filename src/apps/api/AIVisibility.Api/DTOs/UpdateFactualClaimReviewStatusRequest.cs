namespace AIVisibility.Api.DTOs;

/// <summary>
/// PUT /api/factual-claims/{id}/review-status body. <see cref="ReviewStatus"/>
/// is the enum name ("Pending" / "Verified" / "Disputed" / "NeedsContext" /
/// "Ignored"); the controller parses it case-insensitively.
/// </summary>
public record UpdateFactualClaimReviewStatusRequest(string ReviewStatus);
