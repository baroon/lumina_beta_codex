using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrustSignalConfiguration : IEntityTypeConfiguration<TrustSignal>
{
    public void Configure(EntityTypeBuilder<TrustSignal> builder)
    {
        builder.ToTable("trust_signals");
        builder.HasKey(ts => ts.Id);
        builder.Property(ts => ts.Id).HasColumnName("id");
        builder.Property(ts => ts.BrandId).HasColumnName("brand_id");
        builder.Property(ts => ts.SignalType).HasColumnName("signal_type").HasConversion<string>().HasMaxLength(50);
        builder.Property(ts => ts.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(ts => ts.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(ts => ts.Confidence).HasColumnName("confidence");
        builder.Property(ts => ts.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(ts => ts.DiscoveryRunId).HasColumnName("discovery_run_id");
        builder.Property(ts => ts.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(ts => ts.BrandId);
    }
}
