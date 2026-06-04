using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Per-answer persistence for signal-extraction results. Replaces the
/// batch-persist logic that used to live in SignalExtractionJob — moves
/// it inline so ScanExecutor can call it after every AIAnswer and the
/// live counters on the scan-progress screen tick up as the scan runs.
///
/// Source / SourceUrl / BrandSourceClassification dedup still works across
/// answers within a scan because every call looks up existing rows from
/// the DB before deciding to insert (the same logic the old batch path
/// used; just per-answer instead of per-scan).
/// </summary>
public class AnswerSignalWriter : IAnswerSignalWriter
{
    private readonly IAppDbContext _db;
    private readonly ISourceClassifier _classifier;
    private readonly ILogger<AnswerSignalWriter> _logger;

    public AnswerSignalWriter(
        IAppDbContext db,
        ISourceClassifier classifier,
        ILogger<AnswerSignalWriter> logger)
    {
        _db = db;
        _classifier = classifier;
        _logger = logger;
    }

    public async Task WriteAsync(
        SignalExtractionResult result,
        SignalExtractionContext context,
        CancellationToken cancellationToken)
    {
        _db.AnswerSignals.Add(result.Signal);
        foreach (var m in result.Mentions) _db.Mentions.Add(m);
        foreach (var c in result.Candidates) _db.MentionCandidates.Add(c);
        foreach (var a in result.MentionAttributes) _db.MentionAttributes.Add(a);
        foreach (var fc in result.FactualClaims) _db.FactualClaims.Add(fc);
        foreach (var ar in result.AnswerRecommendations) _db.AnswerRecommendations.Add(ar);
        AddMentionPairs(result.Mentions);

        if (result.Citations.Count == 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        var now = DateTime.UtcNow;
        var brandId = context.Brand.Id;
        var draftsBySourceKey = result.Citations
            .GroupBy(SourceKey)
            .ToList();

        // Existing Source rows that match any of this answer's dedup keys.
        var domainKeys = draftsBySourceKey
            .Where(g => g.First().NormalizedDomain is not null)
            .Select(g => g.First().NormalizedDomain!)
            .ToList();
        var nameOnlyKeys = draftsBySourceKey
            .Where(g => g.First().NormalizedDomain is null)
            .Select(g => g.First().NormalizedSourceName)
            .ToList();
        var existingSourcesByDomain = domainKeys.Count == 0
            ? new Dictionary<string, Source>()
            : await _db.Sources.AsNoTracking()
                .Where(s => s.NormalizedDomain != null && domainKeys.Contains(s.NormalizedDomain))
                .ToDictionaryAsync(s => s.NormalizedDomain!, s => s, cancellationToken);
        var existingSourcesByName = nameOnlyKeys.Count == 0
            ? new Dictionary<string, Source>()
            : await _db.Sources.AsNoTracking()
                .Where(s => s.NormalizedDomain == null && nameOnlyKeys.Contains(s.SourceName.ToLower()))
                .ToDictionaryAsync(s => s.SourceName.ToLower(), s => s, cancellationToken);

        // Sources newly added in THIS write call — held in a dictionary so a
        // single answer that cites the same source twice maps to one new row.
        var addedSourcesByKey = new Dictionary<string, Source>();

        var sourceIdByKey = new Dictionary<string, Guid>();
        foreach (var group in draftsBySourceKey)
        {
            var sample = group.First();
            var key = SourceKey(sample);
            Source? existing = null;
            if (sample.NormalizedDomain is not null)
                existingSourcesByDomain.TryGetValue(sample.NormalizedDomain, out existing);
            else
                existingSourcesByName.TryGetValue(sample.NormalizedSourceName, out existing);

            if (existing is not null)
            {
                sourceIdByKey[key] = existing.Id;
                continue;
            }
            if (addedSourcesByKey.TryGetValue(key, out var added))
            {
                sourceIdByKey[key] = added.Id;
                continue;
            }
            var newSource = new Source
            {
                Id = Guid.NewGuid(),
                SourceName = sample.SourceName,
                Domain = sample.NormalizedDomain,
                NormalizedDomain = sample.NormalizedDomain,
                CreatedAt = now,
            };
            _db.Sources.Add(newSource);
            addedSourcesByKey[key] = newSource;
            sourceIdByKey[key] = newSource.Id;
        }

        // SourceUrl dedup by normalized_url.
        var urlDrafts = result.Citations.Where(d => d.NormalizedUrl is not null).ToList();
        var urlKeys = urlDrafts.Select(d => d.NormalizedUrl!).Distinct().ToList();
        var existingUrlsByNorm = urlKeys.Count == 0
            ? new Dictionary<string, SourceUrl>()
            : await _db.SourceUrls.AsNoTracking()
                .Where(u => urlKeys.Contains(u.NormalizedUrl))
                .ToDictionaryAsync(u => u.NormalizedUrl, u => u, cancellationToken);

        var sourceUrlIdByNormalized = new Dictionary<string, Guid>();
        foreach (var draft in urlDrafts)
        {
            var nu = draft.NormalizedUrl!;
            if (sourceUrlIdByNormalized.ContainsKey(nu)) continue;
            if (existingUrlsByNorm.TryGetValue(nu, out var existing))
            {
                sourceUrlIdByNormalized[nu] = existing.Id;
                continue;
            }
            var sourceId = sourceIdByKey[SourceKey(draft)];
            var newUrl = new SourceUrl
            {
                Id = Guid.NewGuid(),
                SourceId = sourceId,
                Url = draft.Url!,
                NormalizedUrl = nu,
                CreatedAt = now,
            };
            _db.SourceUrls.Add(newUrl);
            sourceUrlIdByNormalized[nu] = newUrl.Id;
        }

        // BrandSourceClassification dedup by (brand_id, source_id).
        var sourceIds = sourceIdByKey.Values.Distinct().ToList();
        var existingClassifiedSourceIds = await _db.BrandSourceClassifications.AsNoTracking()
            .Where(c => c.BrandId == brandId && sourceIds.Contains(c.SourceId))
            .Select(c => c.SourceId)
            .ToListAsync(cancellationToken);
        var existingClassifiedSet = existingClassifiedSourceIds.ToHashSet();

        var pendingLlmClassification = new List<(BrandSourceClassification Row, DraftCitation Sample)>();
        foreach (var (key, sourceId) in sourceIdByKey)
        {
            if (existingClassifiedSet.Contains(sourceId)) continue;
            var sample = draftsBySourceKey.First(g => SourceKey(g.First()) == key).First();
            var row = new BrandSourceClassification
            {
                Id = Guid.NewGuid(),
                BrandId = brandId,
                SourceId = sourceId,
                SourceType = sample.ClassifiedAs,
                ConfidenceScore = sample.ConfidenceScore,
                ProvenanceSource = ClassificationSource.RuleBased,
                Status = sample.ClassifiedAs == SourceType.Unknown
                    ? ClassificationStatus.Unknown
                    : ClassificationStatus.Active,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.BrandSourceClassifications.Add(row);
            existingClassifiedSet.Add(sourceId);
            if (sample.ClassifiedAs == SourceType.Unknown)
            {
                pendingLlmClassification.Add((row, sample));
            }
        }

        await RunLlmClassifierAsync(pendingLlmClassification, now, cancellationToken);

        foreach (var draft in result.Citations)
        {
            _db.Citations.Add(new Citation
            {
                Id = Guid.NewGuid(),
                AIAnswerId = draft.AIAnswerId,
                SourceId = sourceIdByKey[SourceKey(draft)],
                SourceUrlId = draft.NormalizedUrl is null ? null : sourceUrlIdByNormalized[draft.NormalizedUrl],
                CitationType = draft.CitationType,
                ConfidenceScore = draft.ConfidenceScore,
                CreatedAt = now,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static string SourceKey(DraftCitation d) =>
        d.NormalizedDomain ?? $"name:{d.NormalizedSourceName}";

    /// <summary>
    /// Generates all unordered MentionPair rows from this answer's mentions
    /// and queues them on the DbContext. Canonical ordering — the pair with
    /// the smaller MentionId by Guid comparison goes in MentionAId — so a
    /// pair is recorded once, not twice. Skips when fewer than 2 mentions
    /// (nothing to pair) and when a single mention pairs with itself
    /// (e.g. brand mentioned twice in the same answer would otherwise
    /// produce a self-pair — meaningless).
    /// </summary>
    private void AddMentionPairs(IReadOnlyList<Mention> mentions)
    {
        if (mentions.Count < 2) return;
        var now = DateTime.UtcNow;
        for (var i = 0; i < mentions.Count; i++)
        {
            for (var j = i + 1; j < mentions.Count; j++)
            {
                var a = mentions[i];
                var b = mentions[j];
                // Same entity in the same answer (e.g. brand named as both
                // Brand and Product) — not a meaningful co-mention.
                if (a.EntityId == b.EntityId && a.EntityType == b.EntityType) continue;

                var (left, right) = a.Id.CompareTo(b.Id) < 0 ? (a, b) : (b, a);
                _db.MentionPairs.Add(new MentionPair
                {
                    Id = Guid.NewGuid(),
                    AIAnswerId = left.AIAnswerId,
                    MentionAId = left.Id,
                    MentionBId = right.Id,
                    CreatedAt = now,
                });
            }
        }
    }

    private async Task RunLlmClassifierAsync(
        List<(BrandSourceClassification Row, DraftCitation Sample)> pending,
        DateTime now,
        CancellationToken ct)
    {
        foreach (var (row, sample) in pending)
        {
            SourceClassificationVerdict? verdict;
            try
            {
                verdict = await _classifier.ClassifyAsync(
                    new SourceClassificationRequest(
                        SourceName: sample.SourceName,
                        NormalizedDomain: sample.NormalizedDomain,
                        SampleUrl: sample.Url),
                    ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex,
                    "LLM source classifier threw for {SourceName}; leaving row at RuleBased/Unknown.",
                    sample.SourceName);
                continue;
            }

            if (verdict is null) continue;

            row.SourceType = verdict.SourceType;
            row.ConfidenceScore = verdict.ConfidenceScore;
            row.ProvenanceSource = ClassificationSource.LLMClassified;
            row.Status = verdict.SourceType == SourceType.Unknown
                ? ClassificationStatus.Unknown
                : ClassificationStatus.Active;
            row.UpdatedAt = now;
        }
    }
}

/// <summary>
/// Builds the per-scan SignalExtractionContext (tracked brand, competitors,
/// products). Used by ScanExecutor to construct the context once per scan
/// before the per-answer loop.
/// </summary>
public class SignalExtractionContextFactory : ISignalExtractionContextFactory
{
    private readonly IAppDbContext _db;

    public SignalExtractionContextFactory(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<SignalExtractionContext> BuildAsync(
        Guid scanRunId, CancellationToken cancellationToken)
    {
        var scan = await _db.ScanRuns
            .Include(s => s.TrackerConfiguration)
            .ThenInclude(t => t.Brand)
            .FirstAsync(s => s.Id == scanRunId, cancellationToken);

        var tracker = scan.TrackerConfiguration;
        var brand = tracker.Brand;

        var competitorIds = await _db.TrackerCompetitors
            .Where(tc => tc.TrackerConfigurationId == tracker.Id)
            .Select(tc => tc.CompetitorId)
            .ToListAsync(cancellationToken);
        var competitors = await _db.Competitors
            .Where(c => competitorIds.Contains(c.Id))
            .ToListAsync(cancellationToken);

        var productIds = await _db.TrackerProducts
            .Where(tp => tp.TrackerConfigurationId == tracker.Id)
            .Select(tp => tp.ProductId)
            .ToListAsync(cancellationToken);
        var products = await _db.Products
            .Where(p => productIds.Contains(p.Id))
            .ToListAsync(cancellationToken);

        return new SignalExtractionContext(brand, competitors, products);
    }
}
