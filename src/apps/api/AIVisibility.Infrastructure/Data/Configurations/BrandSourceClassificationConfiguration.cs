using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class BrandSourceClassificationConfiguration : IEntityTypeConfiguration<BrandSourceClassification>
{
    public void Configure(EntityTypeBuilder<BrandSourceClassification> builder)
    {
        builder.ToTable("brand_source_classifications");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id");
        builder.Property(b => b.BrandId).HasColumnName("brand_id");
        builder.Property(b => b.SourceId).HasColumnName("source_id");
        builder.Property(b => b.SourceUrlId).HasColumnName("source_url_id");

        // SourceType stored as varchar matching existing enum-stored-as-string
        // pattern (Sentiment, RecommendationStrength). source_types reference
        // table provides display metadata; link is by code, not FK.
        builder.Property(b => b.SourceType).HasColumnName("source_type")
            .HasConversion<string>().HasMaxLength(50);

        builder.Property(b => b.ProvenanceSource).HasColumnName("provenance_source")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(b => b.Status).HasColumnName("status")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(b => b.ConfidenceScore).HasColumnName("confidence_score");
        builder.Property(b => b.CreatedAt).HasColumnName("created_at");
        builder.Property(b => b.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne(b => b.Brand).WithMany().HasForeignKey(b => b.BrandId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(b => b.Source).WithMany().HasForeignKey(b => b.SourceId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(b => b.SourceUrlNav).WithMany().HasForeignKey(b => b.SourceUrlId)
            .OnDelete(DeleteBehavior.Restrict);

        // Aggregation/lookup queries hit "all classifications for brand X" and
        // "the classification for (brand, source)" most heavily.
        builder.HasIndex(b => b.BrandId);
        builder.HasIndex(b => new { b.BrandId, b.SourceId }).IsUnique();
        builder.HasIndex(b => b.SourceType);
    }
}
