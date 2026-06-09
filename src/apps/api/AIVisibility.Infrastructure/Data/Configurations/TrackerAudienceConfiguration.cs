using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerAudienceConfiguration : IEntityTypeConfiguration<TrackerAudience>
{
    public void Configure(EntityTypeBuilder<TrackerAudience> builder)
    {
        builder.ToTable("tracker_audiences");
        builder.HasKey(x => new { x.TrackerConfigurationId, x.AudienceId });
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.AudienceId).HasColumnName("audience_id");
        builder.HasIndex(x => x.AudienceId);

        builder.HasOne<Audience>()
            .WithMany()
            .HasForeignKey(x => x.AudienceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
