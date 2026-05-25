using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Prompts;

public class AddCustomPromptCommandHandler : IRequestHandler<AddCustomPromptCommand, Unit>
{
    private readonly IAppDbContext _db;

    public AddCustomPromptCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<Unit> Handle(AddCustomPromptCommand request, CancellationToken cancellationToken)
    {
        var tracker =
            await _db.TrackerConfigurations.FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken)
            ?? throw new InvalidOperationException($"Tracker {request.TrackerId} not found.");

        var text = request.Text?.Trim();
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException("Prompt text is required.");

        var current = await _db.Prompts.CountAsync(
            p => p.TrackerConfigurationId == tracker.Id && p.Status != PromptStatus.Archived,
            cancellationToken);
        if (current >= tracker.PromptAllocation)
            throw new InvalidOperationException("Prompt allocation reached.");

        var now = DateTime.UtcNow;
        _db.Prompts.Add(new Prompt
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = tracker.Id,
            PromptText = text,
            VisibilityCheckId = request.VisibilityCheckId,
            Status = PromptStatus.Draft,
            Source = PromptSource.UserAdded,
            CreatedAt = now,
            UpdatedAt = now,
            Topics = request.PrimaryTopicId.HasValue
                ? new List<PromptTopic> { new() { Id = Guid.NewGuid(), TopicId = request.PrimaryTopicId.Value } }
                : new List<PromptTopic>(),
        });
        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
