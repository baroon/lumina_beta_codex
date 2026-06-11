using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Adds a user-authored topic to a brand. Source = <c>UserAdded</c>
/// (distinguished from the LLM / crawl-derived rows the discovery
/// pipeline writes) and Confidence = 1.0. The new row is anchored to
/// the brand's most recent DiscoveryRun so the FK NOT NULL constraint
/// is satisfied without making the column nullable — a manually-added
/// row is effectively a continuation of the latest discovery snapshot.
/// Case-insensitive duplicate names on the same brand are rejected.
/// </summary>
public record AddBrandTopicCommand(Guid BrandId, string Name) : IRequest<AddBrandTopicResult>;

public sealed record AddBrandTopicResult(Guid TopicId, string Name);
