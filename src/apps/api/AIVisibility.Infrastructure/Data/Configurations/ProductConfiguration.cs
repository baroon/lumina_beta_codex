using System.Text.Json;
using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    private static readonly ValueComparer<List<string>> AliasesComparer = new(
        (a, b) => (a ?? new List<string>()).SequenceEqual(b ?? new List<string>()),
        v => v == null ? 0 : v.Aggregate(0, (acc, s) => HashCode.Combine(acc, s.GetHashCode())),
        v => v == null ? new List<string>() : v.ToList());

    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.BrandId).HasColumnName("brand_id");
        builder.Property(p => p.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(p => p.Aliases)
            .HasColumnName("aliases")
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
            .Metadata.SetValueComparer(AliasesComparer);
        builder.Property(p => p.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(p => p.ProductType).HasColumnName("product_type").HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.Confidence).HasColumnName("confidence");
        builder.Property(p => p.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.DiscoveryRunId).HasColumnName("discovery_run_id");
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(p => p.BrandId);
    }
}
