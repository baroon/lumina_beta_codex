using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

public class DiscoveryRun
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public DiscoveryStatus Status { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int PagesCrawled { get; set; }
    public string? Error { get; set; }

    public Brand Brand { get; set; } = null!;
    public ICollection<CrawledPage> CrawledPages { get; set; } = new List<CrawledPage>();
}
