using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MentionCandidateConfiguration : IEntityTypeConfiguration<MentionCandidate>
{
    public void Configure(EntityTypeBuilder<MentionCandidate> builder)
    {
        builder.ToTable("mention_candidates");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.AIAnswerId).HasColumnName("ai_answer_id");

        builder.Property(c => c.ClaimedEntityType).HasColumnName("claimed_entity_type")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(c => c.ClaimedName).HasColumnName("claimed_name")
            .HasMaxLength(500).IsRequired();
        builder.Property(c => c.NormalizedName).HasColumnName("normalized_name")
            .HasMaxLength(500).IsRequired();

        builder.Property(c => c.EvidenceSnippet).HasColumnName("evidence_snippet")
            .HasMaxLength(2000);
        builder.Property(c => c.ConfidenceScore).HasColumnName("confidence_score");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");

        builder.HasOne(c => c.AIAnswer).WithMany().HasForeignKey(c => c.AIAnswerId);

        builder.HasIndex(c => c.AIAnswerId);
        // Promote-to-tracked screen query: GROUP BY normalized_name + filter by type.
        builder.HasIndex(c => new { c.ClaimedEntityType, c.NormalizedName });
    }
}
