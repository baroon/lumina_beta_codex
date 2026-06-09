namespace AIVisibility.Domain.Entities;

public class PromptMarket
{
    public Guid PromptId { get; set; }
    public Guid MarketId { get; set; }

    public Prompt Prompt { get; set; } = null!;
}
