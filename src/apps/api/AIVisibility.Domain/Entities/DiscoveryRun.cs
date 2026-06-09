using AIVisibility.Domain.Enums;

namespace AIVisibility.Domain.Entities;

public class DiscoveryRun
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public DiscoveryStatus Status { get; set; }
    public DateTime StartedAt { get; set; }
    /// <summary>
    /// Set when the back-end pipeline (crawl + extract) finishes and the
    /// run enters <c>AwaitingConfirmation</c>. Distinct from
    /// <see cref="ConfirmedAt"/> (user action) and <see cref="CompletedAt"/>
    /// (any terminal state). Null until extraction completes.
    /// </summary>
    public DateTime? ExtractedAt { get; set; }
    /// <summary>
    /// Set when the user confirms the wizard. Only populated on Completed
    /// runs; null on Failed runs and on AwaitingConfirmation rows still
    /// pending user action.
    /// </summary>
    public DateTime? ConfirmedAt { get; set; }
    /// <summary>
    /// Terminal-state timestamp. Set when the run reaches Completed (= same
    /// instant as <see cref="ConfirmedAt"/>) or Failed (= failure instant).
    /// </summary>
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
