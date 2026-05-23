using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Prompts;

public class RemovePromptCommandHandler : IRequestHandler<RemovePromptCommand, Unit>
{
    private readonly IAppDbContext _db;

    public RemovePromptCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<Unit> Handle(RemovePromptCommand request, CancellationToken cancellationToken)
    {
        var prompt =
            await _db.Prompts.FirstOrDefaultAsync(
                p => p.Id == request.PromptId && p.TrackerConfigurationId == request.TrackerId,
                cancellationToken)
            ?? throw new InvalidOperationException($"Prompt {request.PromptId} not found.");

        prompt.Status = PromptStatus.Archived;
        prompt.ArchivedAt = DateTime.UtcNow;
        prompt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
