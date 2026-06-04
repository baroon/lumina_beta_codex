using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class AnswerSignalConfiguration : IEntityTypeConfiguration<AnswerSignal>
{
    public void Configure(EntityTypeBuilder<AnswerSignal> builder)
    {
        builder.ToTable("answer_signals");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.AIAnswerId).HasColumnName("ai_answer_id");

        builder.Property(s => s.BrandMentioned).HasColumnName("brand_mentioned");
        builder.Property(s => s.BrandRecommended).HasColumnName("brand_recommended");
        builder.Property(s => s.BrandRank).HasColumnName("brand_rank");
        builder.Property(s => s.BrandSentiment).HasColumnName("brand_sentiment")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(s => s.BrandSentimentScore).HasColumnName("brand_sentiment_score")
            .HasDefaultValue(0.0);
        builder.Property(s => s.BrandRecommendationStrength).HasColumnName("brand_recommendation_strength")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(s => s.TopRecommendedEntity).HasColumnName("top_recommended_entity")
            .HasMaxLength(500);

        builder.Property(s => s.AnswerHasRanking).HasColumnName("answer_has_ranking");
        builder.Property(s => s.AnswerHasComparison).HasColumnName("answer_has_comparison");
        builder.Property(s => s.AnswerHasCitations).HasColumnName("answer_has_citations");

        builder.Property(s => s.OwnedSourceCount).HasColumnName("owned_source_count");
        builder.Property(s => s.CompetitorSourceCount).HasColumnName("competitor_source_count");
        builder.Property(s => s.ThirdPartySourceCount).HasColumnName("third_party_source_count");

        builder.Property(s => s.ConfidenceScore).HasColumnName("confidence_score");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");

        builder.HasOne(s => s.AIAnswer).WithMany().HasForeignKey(s => s.AIAnswerId);

        // 1:1 with AIAnswer.
        builder.HasIndex(s => s.AIAnswerId).IsUnique();
    }
}
