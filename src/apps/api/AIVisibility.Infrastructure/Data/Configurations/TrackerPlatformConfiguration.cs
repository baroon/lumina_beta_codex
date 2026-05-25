using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerPlatformConfiguration : IEntityTypeConfiguration<TrackerPlatform>
{
    public void Configure(EntityTypeBuilder<TrackerPlatform> builder)
    {
        builder.ToTable("tracker_platforms");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.AIPlatformId).HasColumnName("ai_platform_id");
        builder.HasOne(x => x.TrackerConfiguration).WithMany().HasForeignKey(x => x.TrackerConfigurationId);
        builder.HasIndex(x => x.TrackerConfigurationId);
    }
}
