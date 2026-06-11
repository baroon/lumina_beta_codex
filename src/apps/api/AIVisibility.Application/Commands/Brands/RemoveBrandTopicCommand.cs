using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Removes a topic from a brand. Cascade FKs on <c>prompt_topics</c>
/// and <c>tracker_topics</c> clean up the junction rows automatically,
/// so no manual unlink is needed. The handler verifies the topic
/// actually belongs to the supplied brand before deleting so a stale
/// or hostile FE cannot remove a row from another brand by guessing
/// the topic ID.
/// </summary>
public record RemoveBrandTopicCommand(Guid BrandId, Guid TopicId) : IRequest;
