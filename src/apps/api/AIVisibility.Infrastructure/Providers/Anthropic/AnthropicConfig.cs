namespace AIVisibility.Infrastructure.Providers.Anthropic;

public class AnthropicConfig
{
    public const string SectionName = "Anthropic";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "claude-sonnet-4-20250514";
}
