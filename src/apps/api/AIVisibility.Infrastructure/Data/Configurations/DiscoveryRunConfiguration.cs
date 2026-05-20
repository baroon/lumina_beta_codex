using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class DiscoveryRunConfiguration : IEntityTypeConfiguration<DiscoveryRun>
{
    public void Configure(EntityTypeBuilder<DiscoveryRun> builder)
    {
        builder.ToTable("discovery_runs");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).HasColumnName("id");
        builder.Property(d => d.BrandId).HasColumnName("brand_id");
        builder.Property(d => d.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
        builder.Property(d => d.StartedAt).HasColumnName("started_at");
        builder.Property(d => d.CompletedAt).HasColumnName("completed_at");
        builder.Property(d => d.PagesCrawled).HasColumnName("pages_crawled");
        builder.Property(d => d.Error).HasColumnName("error").HasMaxLength(4000);

        builder.HasIndex(d => d.BrandId);
        builder.HasMany(d => d.CrawledPages).WithOne(cp => cp.DiscoveryRun).HasForeignKey(cp => cp.DiscoveryRunId);
        builder.HasMany(d => d.Products).WithOne(p => p.DiscoveryRun).HasForeignKey(p => p.DiscoveryRunId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(d => d.Audiences).WithOne(a => a.DiscoveryRun).HasForeignKey(a => a.DiscoveryRunId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(d => d.Markets).WithOne(m => m.DiscoveryRun).HasForeignKey(m => m.DiscoveryRunId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(d => d.Topics).WithOne(t => t.DiscoveryRun).HasForeignKey(t => t.DiscoveryRunId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(d => d.Competitors).WithOne(c => c.DiscoveryRun).HasForeignKey(c => c.DiscoveryRunId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(d => d.TrustSignals).WithOne(ts => ts.DiscoveryRun).HasForeignKey(ts => ts.DiscoveryRunId).OnDelete(DeleteBehavior.Cascade);
    }
}
