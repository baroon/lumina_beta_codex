using System.Text.Json;
using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class CompetitorConfiguration : IEntityTypeConfiguration<Competitor>
{
    // Matches BrandConfiguration.AliasesComparer — same jsonb<List<string>>
    // shape, same equality semantics so EF change-tracking and snapshot
    // diffs work the same on both entities.
    private static readonly ValueComparer<List<string>> AliasesComparer = new(
        (a, b) => (a ?? new List<string>()).SequenceEqual(b ?? new List<string>()),
        v => v == null ? 0 : v.Aggregate(0, (acc, s) => HashCode.Combine(acc, s.GetHashCode())),
        v => v == null ? new List<string>() : v.ToList());

    public void Configure(EntityTypeBuilder<Competitor> builder)
    {
        builder.ToTable("competitors");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.BrandId).HasColumnName("brand_id");
        builder.Property(c => c.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(c => c.Domain).HasColumnName("domain").HasMaxLength(500);
        builder.Property(c => c.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(c => c.Confidence).HasColumnName("confidence");
        builder.Property(c => c.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(c => c.DiscoveryRunId).HasColumnName("discovery_run_id");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");
        builder.Property(c => c.Aliases)
            .HasColumnName("aliases")
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
            .Metadata.SetValueComparer(AliasesComparer);

        builder.HasIndex(c => c.BrandId);
    }
}
