namespace AIVisibility.Domain.Enums;

/// <summary>
/// Brand-contextual classification of a citation source (Phase 3 plan §3, D14).
/// In v1 this is derived automatically from URL-domain matching against
/// Brand.WebsiteUrl + tracked Competitor.Domain. Phase 4 Slice 0 will move
/// this onto a dedicated BrandSourceClassification table that supports
/// operator overrides; the enum values stay the same.
/// </summary>
public enum SourceClassification
{
    Owned,
    Competitor,
    ThirdParty,
    Unknown,
}
