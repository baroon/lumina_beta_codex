using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class CrawledPageConfiguration : IEntityTypeConfiguration<CrawledPage>
{
    public void Configure(EntityTypeBuilder<CrawledPage> builder)
    {
        builder.ToTable("crawled_pages");
        builder.HasKey(cp => cp.Id);
        builder.Property(cp => cp.Id).HasColumnName("id");
        builder.Property(cp => cp.DiscoveryRunId).HasColumnName("discovery_run_id");
        builder.Property(cp => cp.Url).HasColumnName("url").HasMaxLength(2048).IsRequired();
        builder.Property(cp => cp.Title).HasColumnName("title").HasMaxLength(500);
        builder.Property(cp => cp.MetaDescription).HasColumnName("meta_description").HasMaxLength(1000);
        builder.Property(cp => cp.HeadingsJson).HasColumnName("headings").HasColumnType("jsonb");
        builder.Property(cp => cp.ExtractedTextBlobRef).HasColumnName("extracted_text_blob_ref").HasMaxLength(500);
        builder.Property(cp => cp.StatusCode).HasColumnName("status_code");

        builder.HasIndex(cp => cp.DiscoveryRunId);
    }
}
