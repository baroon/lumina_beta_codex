using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MarketConfiguration : IEntityTypeConfiguration<Market>
{
    public void Configure(EntityTypeBuilder<Market> builder)
    {
        builder.ToTable("markets");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");
        builder.Property(m => m.BrandId).HasColumnName("brand_id");
        builder.Property(m => m.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(m => m.CountryCode).HasColumnName("country_code").HasMaxLength(10);
        builder.Property(m => m.Confidence).HasColumnName("confidence");
        builder.Property(m => m.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(m => m.DiscoveryRunId).HasColumnName("discovery_run_id");
        builder.Property(m => m.CreatedAt).HasColumnName("created_at");
        builder.Property(m => m.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(m => m.BrandId);
    }
}
