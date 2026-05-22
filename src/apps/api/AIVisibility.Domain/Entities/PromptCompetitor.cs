namespace AIVisibility.Domain.Entities;

public class PromptCompetitor
{
    public Guid Id { get; set; }
    public Guid PromptId { get; set; }
    public Guid CompetitorId { get; set; }

    public Prompt Prompt { get; set; } = null!;
}
