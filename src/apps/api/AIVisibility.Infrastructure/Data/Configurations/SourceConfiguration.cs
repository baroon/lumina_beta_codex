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
        builder.Property(s => s.NormalizedDomain).HasColumnName("normalized_domain").HasMaxLength(500);
        builder.Property(s => s.AuthorityScore).HasColumnName("authority_score");
        builder.Property(s => s.PublishedAt).HasColumnName("published_at");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");

        // Dedup is enforced by two partial UNIQUE indexes declared via raw
        // SQL in the migration: one on normalized_domain (when present),
        // one on LOWER(source_name) (when domain is null). EF Core can't
        // express partial / function-based indexes fluently.
    }
}
