namespace AIVisibility.Domain.Entities;

public class CrawledPage
{
    public Guid Id { get; set; }
    public Guid DiscoveryRunId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? MetaDescription { get; set; }
    public List<Heading> Headings { get; set; } = new();
    public string? ExtractedTextBlobRef { get; set; }
    public DateTime CrawledAt { get; set; }

    public DiscoveryRun DiscoveryRun { get; set; } = null!;
}

public record Heading(string Tag, string Text);
