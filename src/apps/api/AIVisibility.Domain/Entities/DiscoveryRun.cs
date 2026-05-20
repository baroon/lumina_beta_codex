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
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Audience> Audiences { get; set; } = new List<Audience>();
    public ICollection<Market> Markets { get; set; } = new List<Market>();
    public ICollection<Topic> Topics { get; set; } = new List<Topic>();
    public ICollection<Competitor> Competitors { get; set; } = new List<Competitor>();
    public ICollection<TrustSignal> TrustSignals { get; set; } = new List<TrustSignal>();
}
