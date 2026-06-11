using AIVisibility.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Brands;

public class RenameBrandTopicCommandHandler
    : IRequestHandler<RenameBrandTopicCommand, RenameBrandTopicResult>
{
    private readonly IAppDbContext _db;

    public RenameBrandTopicCommandHandler(IAppDbContext db) => _db = db;

    public async Task<RenameBrandTopicResult> Handle(
        RenameBrandTopicCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            throw new InvalidOperationException("Topic name cannot be empty.");

        var topic = await _db.Topics
            .FirstOrDefaultAsync(t => t.Id == request.TopicId, cancellationToken)
            ?? throw new InvalidOperationException($"Topic {request.TopicId} not found.");

        if (topic.BrandId != request.BrandId)
            throw new InvalidOperationException(
                $"Topic {request.TopicId} does not belong to brand {request.BrandId}.");

        if (string.Equals(topic.Name, name, StringComparison.Ordinal))
            return new RenameBrandTopicResult(topic.Id, topic.Name);

        var clash = await _db.Topics.AsNoTracking()
            .Where(t => t.BrandId == request.BrandId && t.Id != topic.Id)
            .Select(t => t.Name)
            .ToListAsync(cancellationToken);
        if (clash.Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Topic '{name}' already exists on this brand.");

        topic.Name = name;
        await _db.SaveChangesAsync(cancellationToken);

        return new RenameBrandTopicResult(topic.Id, topic.Name);
    }
}
