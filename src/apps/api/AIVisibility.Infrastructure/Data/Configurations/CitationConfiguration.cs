using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class CitationConfiguration : IEntityTypeConfiguration<Citation>
{
    public void Configure(EntityTypeBuilder<Citation> builder)
    {
        builder.ToTable("citations");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.AIAnswerId).HasColumnName("ai_answer_id");

        // Phase 4 Slice 0: source name / url / classification moved off the
        // citation row onto the normalized Source / SourceUrl /
        // BrandSourceClassification model. The citation just points at the
        // shared Source row (always) and a specific SourceUrl row (when the
        // citation came with a URL).
        builder.Property(c => c.SourceId).HasColumnName("source_id");
        builder.Property(c => c.SourceUrlId).HasColumnName("source_url_id");

        builder.Property(c => c.CitationType).HasColumnName("citation_type")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(c => c.CitationPosition).HasColumnName("citation_position");
        builder.Property(c => c.CitationText).HasColumnName("citation_text").HasMaxLength(2000);
        builder.Property(c => c.EvidenceSnippet).HasColumnName("evidence_snippet").HasMaxLength(500);

        builder.Property(c => c.ConfidenceScore).HasColumnName("confidence_score");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");

        builder.HasOne(c => c.AIAnswer).WithMany().HasForeignKey(c => c.AIAnswerId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(c => c.Source).WithMany().HasForeignKey(c => c.SourceId)
            .OnDelete(DeleteBehavior.Restrict);   // cross-tracker shared row; don't cascade-orphan it.
        builder.HasOne(c => c.SourceUrl).WithMany().HasForeignKey(c => c.SourceUrlId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => c.AIAnswerId);
        builder.HasIndex(c => c.SourceId);
    }
}
