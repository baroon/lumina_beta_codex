using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MentionTopicRecommendationConfiguration : IEntityTypeConfiguration<MentionTopicRecommendation>
{
    public void Configure(EntityTypeBuilder<MentionTopicRecommendation> builder)
    {
        builder.ToTable("mention_topic_recommendations");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.MentionId).HasColumnName("mention_id");

        builder.Property(r => r.TopicName).HasColumnName("topic_name")
            .HasMaxLength(300).IsRequired();
        builder.Property(r => r.TopicNormalized).HasColumnName("topic_normalized")
            .HasMaxLength(300).IsRequired();
        builder.Property(r => r.IsRecommended).HasColumnName("is_recommended");
        builder.Property(r => r.Strength).HasColumnName("strength")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(r => r.CreatedAt).HasColumnName("created_at");

        builder.HasOne(r => r.Mention).WithMany().HasForeignKey(r => r.MentionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.MentionId);
        builder.HasIndex(r => r.TopicNormalized);
    }
}
