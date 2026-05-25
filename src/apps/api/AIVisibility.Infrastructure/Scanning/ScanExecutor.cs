using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AIVisibility.Infrastructure.Scanning;

public class ScanExecutor : IScanExecutor
{
    private readonly IAppDbContext _db;
    private readonly IScanProvider _provider;
    private readonly ILogger<ScanExecutor> _logger;

    public ScanExecutor(IAppDbContext db, IScanProvider provider, ILogger<ScanExecutor> logger)
    {
        _db = db;
        _provider = provider;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid scanRunId, CancellationToken cancellationToken = default)
    {
        var run = await _db.ScanRuns.FirstOrDefaultAsync(r => r.Id == scanRunId, cancellationToken);
        if (run == null) return;

        run.Status = ScanRunStatus.Running;
        await _db.SaveChangesAsync(cancellationToken);

        var promptRuns = await _db.PromptRuns
            .Where(p => p.ScanRunId == scanRunId && p.Status == PromptRunStatus.Pending)
            .ToListAsync(cancellationToken);

        var promptText = await _db.Prompts
            .Where(p => promptRuns.Select(r => r.PromptId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.PromptText, cancellationToken);
        var platformCode = await _db.AIPlatforms
            .Where(p => promptRuns.Select(r => r.AIPlatformId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Code, cancellationToken);

        var completed = 0;
        var failed = 0;
        foreach (var pr in promptRuns)
        {
            pr.Status = PromptRunStatus.Running;
            pr.StartedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            var text = promptText.GetValueOrDefault(pr.PromptId, string.Empty);
            var code = platformCode.GetValueOrDefault(pr.AIPlatformId, string.Empty);
            try
            {
                var answer = await _provider.GetAnswerAsync(code, text, cancellationToken);
                if (answer.Success)
                {
                    _db.AIAnswers.Add(new AIAnswer
                    {
                        Id = Guid.NewGuid(),
                        PromptRunId = pr.Id,
                        AnswerText = answer.Text,
                        RawResponse = answer.RawResponse,
                        CreatedAt = DateTime.UtcNow,
                    });
                    pr.Status = PromptRunStatus.Completed;
                    completed++;
                }
                else
                {
                    pr.Status = PromptRunStatus.Failed;
                    pr.ErrorMessage = answer.Error;
                    failed++;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Scan check {PromptRunId} failed", pr.Id);
                pr.Status = PromptRunStatus.Failed;
                pr.ErrorMessage = ex.Message;
                failed++;
            }

            pr.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        run.CompletedCount = completed;
        run.FailedCount = failed;
        run.Status = ScanRunStatus.Completed;
        run.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }
}
