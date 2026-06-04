using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class AnswerRecommendationConfiguration : IEntityTypeConfiguration<AnswerRecommendation>
{
    public void Configure(EntityTypeBuilder<AnswerRecommendation> builder)
    {
        builder.ToTable("answer_recommendations");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.AIAnswerId).HasColumnName("ai_answer_id");

        builder.Property(r => r.ClaimedName).HasColumnName("claimed_name")
            .HasMaxLength(500).IsRequired();
        builder.Property(r => r.NormalizedName).HasColumnName("normalized_name")
            .HasMaxLength(500).IsRequired();
        builder.Property(r => r.Position).HasColumnName("position");
        builder.Property(r => r.CreatedAt).HasColumnName("created_at");

        builder.HasOne(r => r.AIAnswer).WithMany().HasForeignKey(r => r.AIAnswerId);

        builder.HasIndex(r => r.AIAnswerId);
        // Cross-answer grouping for share-of-recommendations: GROUP BY normalized_name.
        builder.HasIndex(r => r.NormalizedName);
    }
}
