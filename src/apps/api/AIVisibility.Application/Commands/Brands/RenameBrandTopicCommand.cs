using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Renames an existing brand topic. Trims, rejects empty, enforces per-
/// brand case-insensitive uniqueness, no-ops on unchanged, verifies the
/// topic belongs to the supplied brand (security check parallel to
/// RemoveBrandTopicCommand). Mirrors the BrandRename shape — useful for
/// the chip click-to-rename UX.
/// </summary>
public record RenameBrandTopicCommand(Guid BrandId, Guid TopicId, string Name)
    : IRequest<RenameBrandTopicResult>;

public sealed record RenameBrandTopicResult(Guid TopicId, string Name);
