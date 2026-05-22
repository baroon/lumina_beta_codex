namespace AIVisibility.Domain.Entities;

public class PromptAudience
{
    public Guid Id { get; set; }
    public Guid PromptId { get; set; }
    public Guid AudienceId { get; set; }

    public Prompt Prompt { get; set; } = null!;
}
