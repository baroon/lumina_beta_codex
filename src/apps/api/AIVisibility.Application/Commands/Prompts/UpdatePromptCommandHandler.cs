using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Prompts;

public class UpdatePromptCommandHandler : IRequestHandler<UpdatePromptCommand, Unit>
{
    private readonly IAppDbContext _db;

    public UpdatePromptCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<Unit> Handle(UpdatePromptCommand request, CancellationToken cancellationToken)
    {
        var prompt =
            await _db.Prompts.FirstOrDefaultAsync(
                p => p.Id == request.PromptId && p.TrackerConfigurationId == request.TrackerId,
                cancellationToken)
            ?? throw new InvalidOperationException($"Prompt {request.PromptId} not found.");

        var text = request.Text?.Trim();
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException("Prompt text is required.");

        prompt.PromptText = text;
        prompt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
