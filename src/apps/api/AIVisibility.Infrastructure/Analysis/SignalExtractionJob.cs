using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AIVisibility.Infrastructure.Analysis;

/// <summary>
/// Runs per-answer LLM extraction for every <see cref="AIAnswer"/> in a scan
/// (Phase 3 plan §4 step 2). Bounded parallel via <c>SemaphoreSlim</c> (D21).
/// Per-answer failures are logged and skipped — one bad answer doesn't fail
/// the scan (D3). Hangfire's <see cref="AutomaticRetryAttribute"/> retries the
/// whole job 3× on terminal failure; the catch block records
/// <see cref="AnalysisJobStatus.Failed"/> + error message after retries exhaust.
/// </summary>
public class SignalExtractionJob : ISignalExtractionJob
{
    private readonly IAppDbContext _db;
    private readonly SignalExtractor _extractor;
    private readonly AnalysisOptions _options;
    private readonly ILogger<SignalExtractionJob> _logger;

    public SignalExtractionJob(
        IAppDbContext db,
        SignalExtractor extractor,
        IOptions<AnalysisOptions> options,
        ILogger<SignalExtractionJob> logger)
    {
        _db = db;
        _extractor = extractor;
        _options = options.Value;
        _logger = logger;
    }

    // [AutomaticRetry] lives on the interface (ISignalExtractionJob) because
    // ScanExecutor enqueues via interface type and Hangfire reads filter
    // attributes from the serialized job target. See ISignalExtractionJob.
    public async Task ExtractAsync(Guid analysisJobId, CancellationToken cancellationToken)
    {
        var job = await _db.AnalysisJobs.FirstOrDefaultAsync(j => j.Id == analysisJobId, cancellationToken)
            ?? throw new InvalidOperationException($"AnalysisJob {analysisJobId} not found.");

        job.Status = AnalysisJobStatus.Running;
        job.ExtractStartedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            var context = await BuildContextAsync(job.ScanRunId, cancellationToken);
            var answers = await LoadAnswersAsync(job.ScanRunId, cancellationToken);

            if (answers.Count == 0)
            {
                _logger.LogInformation(
                    "AnalysisJob {AnalysisJobId} has no answers to extract (scan {ScanRunId}).",
                    analysisJobId, job.ScanRunId);
            }
            else
            {
                var results = await ExtractAllAsync(answers, context, cancellationToken);
                await PersistResultsAsync(results, context, cancellationToken);
                await _db.SaveChangesAsync(cancellationToken);
            }

            job.ExtractCompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Job-level failure (DB / context build / scan-wide problem). Hangfire's
            // [AutomaticRetry] re-runs the whole job up to its attempt budget; once
            // exhausted, the final attempt records Failed status for reporting (D3).
            _logger.LogError(ex,
                "SignalExtractionJob threw for AnalysisJob {AnalysisJobId}", analysisJobId);
            job.Status = AnalysisJobStatus.Failed;
            job.ErrorMessage = $"{ex.GetType().Name}: {ex.Message}";
            await _db.SaveChangesAsync(CancellationToken.None);
            throw;
        }
    }

    private async Task<SignalExtractionContext> BuildContextAsync(Guid scanRunId, CancellationToken ct)
    {
        var scan = await _db.ScanRuns
            .Include(s => s.TrackerConfiguration)
            .ThenInclude(t => t.Brand)
            .FirstAsync(s => s.Id == scanRunId, ct);

        var tracker = scan.TrackerConfiguration;
        var brand = tracker.Brand;

        var competitorIds = await _db.TrackerCompetitors
            .Where(tc => tc.TrackerConfigurationId == tracker.Id)
            .Select(tc => tc.CompetitorId)
            .ToListAsync(ct);
        var competitors = await _db.Competitors
            .Where(c => competitorIds.Contains(c.Id))
            .ToListAsync(ct);

        var productIds = await _db.TrackerProducts
            .Where(tp => tp.TrackerConfigurationId == tracker.Id)
            .Select(tp => tp.ProductId)
            .ToListAsync(ct);
        var products = await _db.Products
            .Where(p => productIds.Contains(p.Id))
            .ToListAsync(ct);

        return new SignalExtractionContext(brand, competitors, products);
    }

    private async Task<List<AIAnswer>> LoadAnswersAsync(Guid scanRunId, CancellationToken ct)
    {
        var promptRunIds = await _db.PromptRuns
            .Where(pr => pr.ScanRunId == scanRunId)
            .Select(pr => pr.Id)
            .ToListAsync(ct);
        return await _db.AIAnswers
            .Where(a => promptRunIds.Contains(a.PromptRunId))
            .ToListAsync(ct);
    }

    private async Task<List<SignalExtractionResult>> ExtractAllAsync(
        List<AIAnswer> answers, SignalExtractionContext context, CancellationToken ct)
    {
        var concurrency = Math.Max(1, _options.ExtractionConcurrency);
        using var gate = new SemaphoreSlim(concurrency);
        var results = new List<SignalExtractionResult>(answers.Count);
        var resultsLock = new object();

        var tasks = answers.Select(async answer =>
        {
            await gate.WaitAsync(ct);
            try
            {
                // Catch-and-continue per D3 — one bad answer must not fail the scan.
                var result = await _extractor.ExtractAsync(answer, context, ct);
                if (result is null) return;
                lock (resultsLock)
                {
                    results.Add(result);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex,
                    "Per-answer extraction threw for AIAnswer {AIAnswerId}; continuing.",
                    answer.Id);
            }
            finally
            {
                gate.Release();
            }
        });

        await Task.WhenAll(tasks);
        return results;
    }

    /// <summary>
    /// Phase 4 Slice 0 persistence: dedups draft citations across answers,
    /// reuses existing Source / SourceUrl / BrandSourceClassification rows
    /// from the DB when present, and creates new rows where needed. Citation
    /// rows then point at the canonical Source.Id + SourceUrl.Id.
    /// </summary>
    private async Task PersistResultsAsync(
        IReadOnlyList<SignalExtractionResult> results,
        SignalExtractionContext context,
        CancellationToken ct)
    {
        foreach (var r in results)
        {
            _db.AnswerSignals.Add(r.Signal);
            foreach (var m in r.Mentions) _db.Mentions.Add(m);
            foreach (var c in r.Candidates) _db.MentionCandidates.Add(c);
        }

        // Aggregate all draft citations across answers, then dedup before
        // creating Source / SourceUrl / Citation / BrandSourceClassification rows.
        var allDrafts = results.SelectMany(r => r.Citations).ToList();
        if (allDrafts.Count == 0) return;

        // Group drafts by Source dedup key.
        //   With URL → group by normalized_domain (e.g. "acme.com").
        //   Without URL → group by normalized_source_name (e.g. "trustpilot").
        // This collapses cross-answer citations of the same source onto one
        // Source row.
        var draftsBySourceKey = allDrafts
            .GroupBy(d => SourceKey(d))
            .ToList();

        // Pre-fetch existing Source rows that match any of the dedup keys,
        // so we can reuse cross-scan Source rows instead of duplicating.
        var domainKeys = draftsBySourceKey
            .Where(g => g.First().NormalizedDomain is not null)
            .Select(g => g.First().NormalizedDomain!)
            .ToList();
        var nameOnlyKeys = draftsBySourceKey
            .Where(g => g.First().NormalizedDomain is null)
            .Select(g => g.First().NormalizedSourceName)
            .ToList();

        var existingSourcesByDomain = await _db.Sources.AsNoTracking()
            .Where(s => s.NormalizedDomain != null && domainKeys.Contains(s.NormalizedDomain))
            .ToDictionaryAsync(s => s.NormalizedDomain!, s => s, ct);
        var existingSourcesByName = await _db.Sources.AsNoTracking()
            .Where(s => s.NormalizedDomain == null && nameOnlyKeys.Contains(s.SourceName.ToLower()))
            .ToDictionaryAsync(s => s.SourceName.ToLower(), s => s, ct);

        // Canonical source id per dedup key.
        var sourceIdByKey = new Dictionary<string, Guid>();
        var now = DateTime.UtcNow;
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
            }
            else
            {
                var newSource = new Source
                {
                    Id = Guid.NewGuid(),
                    SourceName = sample.SourceName,
                    Domain = sample.NormalizedDomain, // raw + canonical are the same here; normalize is idempotent
                    NormalizedDomain = sample.NormalizedDomain,
                    CreatedAt = now,
                };
                _db.Sources.Add(newSource);
                sourceIdByKey[key] = newSource.Id;
            }
        }

        // SourceUrl dedup by normalized_url. Pre-fetch existing.
        var urlDrafts = allDrafts.Where(d => d.NormalizedUrl is not null).ToList();
        var urlKeys = urlDrafts.Select(d => d.NormalizedUrl!).Distinct().ToList();
        var existingUrlsByNorm = urlKeys.Count == 0
            ? new Dictionary<string, SourceUrl>()
            : await _db.SourceUrls.AsNoTracking()
                .Where(u => urlKeys.Contains(u.NormalizedUrl))
                .ToDictionaryAsync(u => u.NormalizedUrl, u => u, ct);

        var sourceUrlIdByNormalized = new Dictionary<string, Guid>();
        foreach (var draft in urlDrafts)
        {
            var nu = draft.NormalizedUrl!;
            if (sourceUrlIdByNormalized.ContainsKey(nu)) continue;
            if (existingUrlsByNorm.TryGetValue(nu, out var existing))
            {
                sourceUrlIdByNormalized[nu] = existing.Id;
            }
            else
            {
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
        }

        // BrandSourceClassification dedup by (brand_id, source_id). Pre-fetch
        // existing classifications for this brand — they're persistent across
        // scans, so we only create new rows when a source first appears.
        var brandId = context.Brand.Id;
        var sourceIds = sourceIdByKey.Values.Distinct().ToList();
        var existingClassifications = await _db.BrandSourceClassifications.AsNoTracking()
            .Where(c => c.BrandId == brandId && sourceIds.Contains(c.SourceId))
            .Select(c => c.SourceId)
            .ToListAsync(ct);
        var existingClassifiedSourceIds = existingClassifications.ToHashSet();

        foreach (var (key, sourceId) in sourceIdByKey)
        {
            if (existingClassifiedSourceIds.Contains(sourceId)) continue;
            // Use the classifier verdict from any draft in the group — within
            // a single scan, classification is deterministic per (brand, source).
            var sample = draftsBySourceKey.First(g => SourceKey(g.First()) == key).First();
            _db.BrandSourceClassifications.Add(new BrandSourceClassification
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
            });
        }

        // Finally, create Citation rows pointing at canonical Source / SourceUrl ids.
        foreach (var draft in allDrafts)
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
    }

    /// <summary>
    /// Source dedup key. With URL, groups by normalized_domain (so all
    /// citations of "blog.acme.com" + "acme.com/page" collapse to one Source
    /// when the normalizer agrees on the host). Without URL, falls back to
    /// the normalized source name for mentioned-source citations.
    /// </summary>
    private static string SourceKey(DraftCitation d) =>
        d.NormalizedDomain ?? $"name:{d.NormalizedSourceName}";
}
