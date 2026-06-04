using MediatR;

namespace AIVisibility.Application.Queries.Claims;

/// <summary>
/// List the brand-side factual claims extracted on this scan (Phase 4
/// measurement-model expansion, item #14). Powers the per-scan
/// "Factual claims" review page. Optional review-status filter so the FE
/// can show "Pending review" inbox separately from "All claims."
/// Returns null when the scan doesn't exist.
/// </summary>
public record GetScanClaimsQuery(Guid ScanRunId, string? ReviewStatus = null)
    : IRequest<ScanClaimsDto?>;

public sealed record ScanClaimsDto(
    Guid ScanRunId,
    IReadOnlyList<FactualClaimDto> Claims);

public sealed record FactualClaimDto(
    Guid Id,
    /// <summary>The brand/competitor/product the claim is about.</summary>
    string EntityName,
    string EntityType,
    string ClaimText,
    string Subject,
    string AssertedValue,
    string EvidenceSnippet,
    /// <summary><c>Verifiable</c> / <c>Subjective</c> / <c>Unverifiable</c>.</summary>
    string Verifiability,
    /// <summary><c>Pending</c> / <c>Verified</c> / <c>Disputed</c>.</summary>
    string ReviewStatus,
    double ConfidenceScore,
    DateTime CreatedAt);
