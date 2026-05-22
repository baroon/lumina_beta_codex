namespace AIVisibility.Domain.Entities;

public class PromptTopic
{
    public Guid Id { get; set; }
    public Guid PromptId { get; set; }
    public Guid TopicId { get; set; }

    public Prompt Prompt { get; set; } = null!;
}
