using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptTopicConfiguration : IEntityTypeConfiguration<PromptTopic>
{
    public void Configure(EntityTypeBuilder<PromptTopic> builder)
    {
        builder.ToTable("prompt_topics");
        builder.HasKey(x => new { x.PromptId, x.TopicId });
        builder.Property(x => x.PromptId).HasColumnName("prompt_id");
        builder.Property(x => x.TopicId).HasColumnName("topic_id");
        builder.HasIndex(x => x.TopicId);

        builder.HasOne<Topic>()
            .WithMany()
            .HasForeignKey(x => x.TopicId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
