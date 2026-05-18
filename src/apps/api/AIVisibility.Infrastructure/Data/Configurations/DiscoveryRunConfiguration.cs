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
    }
}
