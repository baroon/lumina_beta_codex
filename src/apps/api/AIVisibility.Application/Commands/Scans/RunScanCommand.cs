using AIVisibility.Domain.Enums;
using MediatR;

namespace AIVisibility.Application.Commands.Scans;

/// <summary>Creates a scan run, fans it out to PromptRuns (active prompts × platforms), and queues it.</summary>
public record RunScanCommand(Guid TrackerId, ScanTriggerType TriggerType = ScanTriggerType.Manual)
    : IRequest<RunScanResult>;

public record RunScanResult(Guid ScanRunId, int ScanCheckCount);
