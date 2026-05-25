using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.BrandId).HasColumnName("brand_id");
        builder.Property(p => p.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(p => p.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(p => p.ProductType).HasColumnName("product_type").HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.Confidence).HasColumnName("confidence");
        builder.Property(p => p.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.DiscoveryRunId).HasColumnName("discovery_run_id");

        builder.HasIndex(p => p.BrandId);
    }
}
