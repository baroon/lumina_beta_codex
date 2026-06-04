using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class SourceConfiguration : IEntityTypeConfiguration<Source>
{
    public void Configure(EntityTypeBuilder<Source> builder)
    {
        builder.ToTable("sources");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");

        builder.Property(s => s.SourceName).HasColumnName("source_name")
            .HasMaxLength(500).IsRequired();
        builder.Property(s => s.Domain).HasColumnName("domain").HasMaxLength(500);
        builder.Property(s => s.NormalizedDomain).HasColumnName("normalized_domain").HasMaxLength(500);
        builder.Property(s => s.AuthorityScore).HasColumnName("authority_score");
        builder.Property(s => s.PublishedAt).HasColumnName("published_at");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");

        // Dedup index: a Source is unique by (normalized_domain, source_name)
        // when the domain is set, or by source_name alone for mentioned-source
        // citations without a URL.
        builder.HasIndex(s => s.NormalizedDomain);
        builder.HasIndex(s => s.SourceName);
    }
}
