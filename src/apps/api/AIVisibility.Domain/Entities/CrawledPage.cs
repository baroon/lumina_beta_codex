namespace AIVisibility.Domain.Entities;

public class CrawledPage
{
    public Guid Id { get; set; }
    public Guid DiscoveryRunId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? MetaDescription { get; set; }
    public string? HeadingsJson { get; set; }
    public string? ExtractedTextBlobRef { get; set; }
    public int StatusCode { get; set; }

    public DiscoveryRun DiscoveryRun { get; set; } = null!;
}
