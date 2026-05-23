using MediatR;

namespace AIVisibility.Application.Commands.Prompts;

/// <summary>Confirms the tracker's Draft prompts, promoting them to Active (ADR-002 §8).</summary>
public record ConfirmPromptsCommand(Guid TrackerId) : IRequest<ConfirmPromptsResult>;

public record ConfirmPromptsResult(int ActivatedCount);
