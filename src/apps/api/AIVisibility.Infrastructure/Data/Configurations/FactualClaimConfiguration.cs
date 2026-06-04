using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class FactualClaimConfiguration : IEntityTypeConfiguration<FactualClaim>
{
    public void Configure(EntityTypeBuilder<FactualClaim> builder)
    {
        builder.ToTable("factual_claims");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.MentionId).HasColumnName("mention_id");
        builder.Property(c => c.ClaimText).HasColumnName("claim_text")
            .HasMaxLength(1000).IsRequired();
        builder.Property(c => c.Subject).HasColumnName("subject")
            .HasMaxLength(100).IsRequired();
        builder.Property(c => c.AssertedValue).HasColumnName("asserted_value")
            .HasMaxLength(500).IsRequired();
        builder.Property(c => c.EvidenceSnippet).HasColumnName("evidence_snippet")
            .HasMaxLength(500);
        builder.Property(c => c.Verifiability).HasColumnName("verifiability")
            .HasConversion<string>().HasMaxLength(20);
        builder.Property(c => c.ReviewStatus).HasColumnName("review_status")
            .HasConversion<string>().HasMaxLength(20)
            .HasDefaultValue(Domain.Enums.ClaimReviewStatus.Pending);
        builder.Property(c => c.ConfidenceScore).HasColumnName("confidence_score");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");

        builder.HasOne(c => c.Mention).WithMany().HasForeignKey(c => c.MentionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.MentionId);
        // "What does AI keep saying about our founding year?" reads filter
        // on subject across scans.
        builder.HasIndex(c => c.Subject);
        // "Show me claims awaiting review" — the load-bearing read for the
        // future review inbox.
        builder.HasIndex(c => c.ReviewStatus);
    }
}
