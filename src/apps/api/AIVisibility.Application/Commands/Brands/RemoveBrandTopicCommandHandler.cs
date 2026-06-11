using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RemoveBrandTopicCommandHandler : IRequestHandler<RemoveBrandTopicCommand>
{
    private readonly IAppDbContext _db;

    public RemoveBrandTopicCommandHandler(IAppDbContext db) => _db = db;

    public async Task Handle(RemoveBrandTopicCommand request, CancellationToken cancellationToken)
    {
        var topic = await _db.Topics
            .FirstOrDefaultAsync(t => t.Id == request.TopicId, cancellationToken)
            ?? throw new InvalidOperationException($"Topic {request.TopicId} not found.");

        if (topic.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Topic {request.TopicId} does not belong to brand {request.BrandId}.");

        _db.Topics.Remove(topic);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
