using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MentionRecommendationContextConfiguration : IEntityTypeConfiguration<MentionRecommendationContext>
{
    public void Configure(EntityTypeBuilder<MentionRecommendationContext> builder)
    {
        builder.ToTable("mention_recommendation_contexts");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.MentionId).HasColumnName("mention_id");

        builder.Property(c => c.ContextType).HasColumnName("context_type")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(c => c.ContextValue).HasColumnName("context_value")
            .HasMaxLength(300).IsRequired();
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");

        builder.HasOne(c => c.Mention).WithMany().HasForeignKey(c => c.MentionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.MentionId);
        builder.HasIndex(c => new { c.ContextType, c.ContextValue });
    }
}
