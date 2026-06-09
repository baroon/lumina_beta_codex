using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerTopicConfiguration : IEntityTypeConfiguration<TrackerTopic>
{
    public void Configure(EntityTypeBuilder<TrackerTopic> builder)
    {
        builder.ToTable("tracker_topics");
        builder.HasKey(x => new { x.TrackerConfigurationId, x.TopicId });
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.TopicId).HasColumnName("topic_id");
        builder.HasIndex(x => x.TopicId);

        builder.HasOne<Topic>()
            .WithMany()
            .HasForeignKey(x => x.TopicId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
