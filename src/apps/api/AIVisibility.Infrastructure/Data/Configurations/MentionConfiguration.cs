using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MentionConfiguration : IEntityTypeConfiguration<Mention>
{
    public void Configure(EntityTypeBuilder<Mention> builder)
    {
        builder.ToTable("mentions", t =>
        {
            // D12 + D18: tracked-only universe means entity_id is never null.
            // DB-level guard against the bug class that hit last attempt
            // (Brand mentions with null entity_id slipping through to reports).
            t.HasCheckConstraint("chk_entity_id_not_null", "entity_id IS NOT NULL");
        });

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");
        builder.Property(m => m.AIAnswerId).HasColumnName("ai_answer_id");

        builder.Property(m => m.EntityType).HasColumnName("entity_type")
            .HasConversion<string>().HasMaxLength(50);
        // Polymorphic per D12 — no DB-level FK because entity_id targets vary by entity_type.
        builder.Property(m => m.EntityId).HasColumnName("entity_id");

        builder.Property(m => m.NormalizedName).HasColumnName("normalized_name")
            .HasMaxLength(500).IsRequired();

        builder.Property(m => m.IsRecommended).HasColumnName("is_recommended");
        builder.Property(m => m.RecommendationStrength).HasColumnName("recommendation_strength")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(m => m.Sentiment).HasColumnName("sentiment")
            .HasConversion<string>().HasMaxLength(50);

        builder.Property(m => m.ConfidenceScore).HasColumnName("confidence_score");
        builder.Property(m => m.EvidenceSnippet).HasColumnName("evidence_snippet")
            .HasMaxLength(2000);
        builder.Property(m => m.CreatedAt).HasColumnName("created_at");

        builder.HasOne(m => m.AIAnswer).WithMany().HasForeignKey(m => m.AIAnswerId);

        builder.HasIndex(m => m.AIAnswerId);
        // "How many times was Competitor X mentioned this scan/month" reads
        // filter on entity_type + entity_id heavily.
        builder.HasIndex(m => new { m.EntityType, m.EntityId });
    }
}
