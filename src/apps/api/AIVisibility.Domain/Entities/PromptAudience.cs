namespace AIVisibility.Domain.Entities;

public class PromptAudience
{
    public Guid PromptId { get; set; }
    public Guid AudienceId { get; set; }

    public Prompt Prompt { get; set; } = null!;
}
