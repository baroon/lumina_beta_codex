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
        var checkById = (await _db.VisibilityChecks
            .Where(v => checkIds.Contains(v.Id))
            .Select(v => new { v.Id, v.Name, v.Description })
            .ToListAsync(cancellationToken))
            .ToDictionary(c => c.Id);
        var rawTemplates = await _db.PromptTemplates
            .Where(t => checkIds.Contains(t.VisibilityCheckId))
            .Select(t => new { t.Id, t.VisibilityCheckId, t.TemplateText })
            .ToListAsync(cancellationToken);
        var templates = rawTemplates
            .Select(t => new PromptTemplateInput(
                t.Id,
                t.VisibilityCheckId,
                t.TemplateText,
                checkById.TryGetValue(t.VisibilityCheckId, out var c) ? c.Name : string.Empty,
                checkById.TryGetValue(t.VisibilityCheckId, out var d) ? d.Description ?? string.Empty : string.Empty))
            .ToList();

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

        var productIds = await _db.TrackerProducts
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.ProductId)
            .ToListAsync(cancellationToken);
        var products = await _db.Products
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new CoverageRef(p.Id, p.Name))
            .ToListAsync(cancellationToken);

        var audienceIds = await _db.TrackerAudiences
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.AudienceId)
            .ToListAsync(cancellationToken);
        var audiences = await _db.Audiences
            .Where(a => audienceIds.Contains(a.Id))
            .Select(a => new CoverageRef(a.Id, a.Name))
            .ToListAsync(cancellationToken);

        var marketIds = await _db.TrackerMarkets
            .Where(x => x.TrackerConfigurationId == tracker.Id)
            .Select(x => x.MarketId)
            .ToListAsync(cancellationToken);
        var markets = await _db.Markets
            .Where(m => marketIds.Contains(m.Id))
            .Select(m => new CoverageRef(m.Id, m.Name))
            .ToListAsync(cancellationToken);

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
                && (!request.TopicId.HasValue || p.Topics.Any(t => t.TopicId == request.TopicId.Value)))
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
            exclude,
            brand.BrandProfile?.Industry,
            brand.BrandProfile?.Positioning,
            products,
            audiences,
            markets);

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
                PromptTemplateId = g.PromptTemplateId,
                Status = PromptStatus.Draft,
                Source = PromptSource.Generated,
                CreatedAt = now,
                UpdatedAt = now,
                Topics = g.TopicIds.Select(id => new PromptTopic { Id = Guid.NewGuid(), TopicId = id }).ToList(),
                Competitors = g.CompetitorIds
                    .Select(id => new PromptCompetitor { Id = Guid.NewGuid(), CompetitorId = id })
                    .ToList(),
                Products = g.ProductIds
                    .Select(id => new PromptProduct { Id = Guid.NewGuid(), ProductId = id })
                    .ToList(),
                Audiences = g.AudienceIds
                    .Select(id => new PromptAudience { Id = Guid.NewGuid(), AudienceId = id })
                    .ToList(),
                Markets = g.MarketIds
                    .Select(id => new PromptMarket { Id = Guid.NewGuid(), MarketId = id })
                    .ToList(),
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return new GeneratePromptsResult(generated.Count);
    }
}
