using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class SourceUrlConfiguration : IEntityTypeConfiguration<SourceUrl>
{
    public void Configure(EntityTypeBuilder<SourceUrl> builder)
    {
        builder.ToTable("source_urls");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasColumnName("id");
        builder.Property(u => u.SourceId).HasColumnName("source_id");

        builder.Property(u => u.Url).HasColumnName("url")
            .HasMaxLength(2048).IsRequired();
        builder.Property(u => u.NormalizedUrl).HasColumnName("normalized_url")
            .HasMaxLength(2048).IsRequired();
        builder.Property(u => u.Title).HasColumnName("title").HasMaxLength(500);
        builder.Property(u => u.CreatedAt).HasColumnName("created_at");

        builder.HasOne(u => u.Source).WithMany(s => s.Urls).HasForeignKey(u => u.SourceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Dedup index: a SourceUrl is unique by normalized_url.
        builder.HasIndex(u => u.NormalizedUrl).IsUnique();
        builder.HasIndex(u => u.SourceId);
    }
}
