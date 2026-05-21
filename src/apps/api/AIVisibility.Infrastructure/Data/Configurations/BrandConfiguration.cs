using System.Text.Json;
using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class BrandConfiguration : IEntityTypeConfiguration<Brand>
{
    private static readonly ValueComparer<List<string>> AliasesComparer = new(
        (a, b) => (a ?? new List<string>()).SequenceEqual(b ?? new List<string>()),
        v => v == null ? 0 : v.Aggregate(0, (acc, s) => HashCode.Combine(acc, s.GetHashCode())),
        v => v == null ? new List<string>() : v.ToList());

    // Tolerant read: legacy/blank values (null, "", or the JSON empty-string "")
    // and anything that isn't a JSON array decode to an empty list rather than throwing.
    public static List<string> DeserializeAliases(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch (JsonException)
        {
            return new List<string>();
        }
    }

    public void Configure(EntityTypeBuilder<Brand> builder)
    {
        builder.ToTable("brands");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id");
        builder.Property(b => b.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(b => b.WebsiteUrl).HasColumnName("website_url").HasMaxLength(2048).IsRequired();
        builder.Property(b => b.WorkspaceId).HasColumnName("workspace_id");
        builder.Property(b => b.CreatedAt).HasColumnName("created_at");
        builder.Property(b => b.UpdatedAt).HasColumnName("updated_at");

        builder.Property(b => b.Aliases)
            .HasColumnName("aliases")
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => DeserializeAliases(v))
            .Metadata.SetValueComparer(AliasesComparer);

        builder.HasMany(b => b.DiscoveryRuns).WithOne(d => d.Brand).HasForeignKey(d => d.BrandId);
        builder.HasOne(b => b.BrandProfile).WithOne(bp => bp.Brand).HasForeignKey<BrandProfile>(bp => bp.BrandId);
        builder.HasMany(b => b.Products).WithOne(p => p.Brand).HasForeignKey(p => p.BrandId);
        builder.HasMany(b => b.Audiences).WithOne(a => a.Brand).HasForeignKey(a => a.BrandId);
        builder.HasMany(b => b.Markets).WithOne(m => m.Brand).HasForeignKey(m => m.BrandId);
        builder.HasMany(b => b.Topics).WithOne(t => t.Brand).HasForeignKey(t => t.BrandId);
        builder.HasMany(b => b.Competitors).WithOne(c => c.Brand).HasForeignKey(c => c.BrandId);
        builder.HasMany(b => b.TrustSignals).WithOne(ts => ts.Brand).HasForeignKey(ts => ts.BrandId);
    }
}
