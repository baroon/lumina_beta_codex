using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerPlatformConfiguration : IEntityTypeConfiguration<TrackerPlatform>
{
    public void Configure(EntityTypeBuilder<TrackerPlatform> builder)
    {
        builder.ToTable("tracker_platforms");
        builder.HasKey(x => new { x.TrackerConfigurationId, x.AIPlatformId });
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.AIPlatformId).HasColumnName("ai_platform_id");
        builder.HasIndex(x => x.AIPlatformId);

        // TrackerConfiguration has no `Platforms` collection — so the owner-side
        // relationship must be declared explicitly.
        builder.HasOne(x => x.TrackerConfiguration)
            .WithMany()
            .HasForeignKey(x => x.TrackerConfigurationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<AIPlatform>()
            .WithMany()
            .HasForeignKey(x => x.AIPlatformId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
