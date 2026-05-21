namespace AIVisibility.Domain.Entities;

public class Brand
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string WebsiteUrl { get; set; } = string.Empty;
    public Guid WorkspaceId { get; set; }

    /// <summary>Alternate brand names ("also known as") used downstream as a proxy for brand mention detection.</summary>
    public List<string> Aliases { get; set; } = new();

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<DiscoveryRun> DiscoveryRuns { get; set; } = new List<DiscoveryRun>();
    public BrandProfile? BrandProfile { get; set; }
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Audience> Audiences { get; set; } = new List<Audience>();
    public ICollection<Market> Markets { get; set; } = new List<Market>();
    public ICollection<Topic> Topics { get; set; } = new List<Topic>();
    public ICollection<Competitor> Competitors { get; set; } = new List<Competitor>();
    public ICollection<TrustSignal> TrustSignals { get; set; } = new List<TrustSignal>();
}
