namespace AIVisibility.Domain.Entities;

public class PromptProduct
{
    public Guid Id { get; set; }
    public Guid PromptId { get; set; }
    public Guid ProductId { get; set; }

    public Prompt Prompt { get; set; } = null!;
}
