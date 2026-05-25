using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Application.Commands.Prompts;

public class GeneratePromptsCommandHandler : IRequestHandler<GeneratePromptsCommand, GeneratePromptsResult>
{
    private readonly IAppDbContext _db;
    private readonly IPromptGenerator _generator;

    public GeneratePromptsCommandHandler(IAppDbContext db, IPromptGenerator generator)
    {
        _db = db;
        _generator = generator;
    }

    public async Task<GeneratePromptsResult> Handle(GeneratePromptsCommand request, CancellationToken cancellationToken)
    {
        var tracker =
            await _db.TrackerConfigurations.FirstOrDefaultAsync(t => t.Id == request.TrackerId, cancellationToken)
            ?? throw new InvalidOperationException($"Tracker {request.TrackerId} not found.");

        var brand = await _db.Brands
            .Include(b => b.BrandProfile)
            .FirstAsync(b => b.Id == tracker.BrandId, cancellationToken);

        var checkIds = await _db.TrackerVisibilityChecks
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.VisibilityCheckId)
            .ToListAsync(cancellationToken);
        var templates = await _db.PromptTemplates
            .Where(t => checkIds.Contains(t.VisibilityCheckId))
            .OrderBy(t => t.DisplayOrder)
            .Select(t => new PromptTemplateInput(t.Id, t.VisibilityCheckId, t.TemplateText))
            .ToListAsync(cancellationToken);

        var topicIds = await _db.TrackerTopics
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.TopicId)
            .ToListAsync(cancellationToken);
        var topics = await _db.Topics
            .Where(t => topicIds.Contains(t.Id))
            .Select(t => new CoverageRef(t.Id, t.Name))
            .ToListAsync(cancellationToken);

        var competitorIds = await _db.TrackerCompetitors
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.CompetitorId)
            .ToListAsync(cancellationToken);
        var competitors = await _db.Competitors
            .Where(c => competitorIds.Contains(c.Id))
            .Select(c => new CoverageRef(c.Id, c.Name))
            .ToListAsync(cancellationToken);

        var marketName = await _db.Markets
            .Where(m => m.BrandId == tracker.BrandId)
            .Select(m => m.Name)
            .FirstOrDefaultAsync(cancellationToken);

        // Optional filters: regenerate only a slice (by Visibility Check and/or Topic).
        if (request.VisibilityCheckId.HasValue)
            templates = templates.Where(t => t.VisibilityCheckId == request.VisibilityCheckId.Value).ToList();
        if (request.TopicId.HasValue)
            topics = topics.Where(t => t.Id == request.TopicId.Value).ToList();

        // Load every prompt for the tracker (incl. archived) so we can keep user-added ones,
        // replace only matching generated drafts, and exclude removed prompts from regeneration.
        var all = await _db.Prompts
            .Include(p => p.Topics)
            .Include(p => p.Competitors)
            .Include(p => p.Products)
            .Include(p => p.Audiences)
            .Include(p => p.Markets)
            .Where(p => p.TrackerConfigurationId == tracker.Id)
            .ToListAsync(cancellationToken);

        // Replace only generated Draft prompts in the targeted slice; user-added + active prompts stay.
        var replaced = all
            .Where(p =>
                p.Status == PromptStatus.Draft
                && p.Source == PromptSource.Generated
                && (!request.VisibilityCheckId.HasValue || p.VisibilityCheckId == request.VisibilityCheckId.Value)
                && (!request.TopicId.HasValue || p.PrimaryTopicId == request.TopicId.Value))
            .ToList();
        _db.Prompts.RemoveRange(replaced);

        var kept = all.Where(p => p.Status != PromptStatus.Archived && !replaced.Contains(p)).ToList();

        // Don't resurface removed (archived) prompts, and don't duplicate what's kept.
        var exclude = all
            .Where(p => p.Status == PromptStatus.Archived)
            .Select(p => p.PromptText)
            .Concat(kept.Select(p => p.PromptText))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var budget = Math.Max(0, tracker.PromptAllocation - kept.Count);
        var context = new PromptGenerationContext(
            brand.Name,
            brand.BrandProfile?.Category,
            marketName,
            templates,
            topics,
            competitors,
            budget,
            exclude);

        var generated = await _generator.GenerateAsync(context, cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var g in generated)
        {
            _db.Prompts.Add(new Prompt
            {
                Id = Guid.NewGuid(),
                TrackerConfigurationId = tracker.Id,
                PromptText = g.Text,
                VisibilityCheckId = g.VisibilityCheckId,
                PrimaryTopicId = g.PrimaryTopicId,
                PromptTemplateId = g.PromptTemplateId,
                Status = PromptStatus.Draft,
                Source = PromptSource.Generated,
                CreatedAt = now,
                UpdatedAt = now,
                Topics = g.TopicIds.Select(id => new PromptTopic { Id = Guid.NewGuid(), TopicId = id }).ToList(),
                Competitors = g.CompetitorIds
                    .Select(id => new PromptCompetitor { Id = Guid.NewGuid(), CompetitorId = id })
                    .ToList(),
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return new GeneratePromptsResult(generated.Count);
    }
}
