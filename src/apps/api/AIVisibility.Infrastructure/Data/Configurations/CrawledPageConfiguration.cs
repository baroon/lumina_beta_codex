using System.Text.Json;
using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class CrawledPageConfiguration : IEntityTypeConfiguration<CrawledPage>
{
    private static readonly ValueComparer<List<Heading>> HeadingsComparer = new(
        (a, b) => (a ?? new List<Heading>()).SequenceEqual(b ?? new List<Heading>()),
        v => v == null ? 0 : v.Aggregate(0, (acc, h) => HashCode.Combine(acc, h.Tag.GetHashCode(), h.Text.GetHashCode())),
        v => v == null ? new List<Heading>() : v.ToList());

    public void Configure(EntityTypeBuilder<CrawledPage> builder)
    {
        builder.ToTable("crawled_pages");
        builder.HasKey(cp => cp.Id);
        builder.Property(cp => cp.Id).HasColumnName("id");
        builder.Property(cp => cp.DiscoveryRunId).HasColumnName("discovery_run_id");
        builder.Property(cp => cp.Url).HasColumnName("url").HasMaxLength(2048).IsRequired();
        builder.Property(cp => cp.Title).HasColumnName("title").HasMaxLength(500);
        builder.Property(cp => cp.MetaDescription).HasColumnName("meta_description").HasMaxLength(1000);
        builder.Property(cp => cp.Headings)
            .HasColumnName("headings")
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<Heading>>(v, (JsonSerializerOptions?)null) ?? new List<Heading>())
            .Metadata.SetValueComparer(HeadingsComparer);
        builder.Property(cp => cp.ExtractedTextBlobRef).HasColumnName("extracted_text_blob_ref").HasMaxLength(500);
        builder.Property(cp => cp.CrawledAt).HasColumnName("crawled_at");

        builder.HasIndex(cp => cp.DiscoveryRunId);
        builder.HasIndex(cp => new { cp.DiscoveryRunId, cp.Url })
            .IsUnique()
            .HasDatabaseName("ix_crawled_pages_run_url");
    }
}
