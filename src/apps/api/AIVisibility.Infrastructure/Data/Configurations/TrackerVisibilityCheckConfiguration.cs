using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerVisibilityCheckConfiguration : IEntityTypeConfiguration<TrackerVisibilityCheck>
{
    public void Configure(EntityTypeBuilder<TrackerVisibilityCheck> builder)
    {
        builder.ToTable("tracker_visibility_checks");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.VisibilityCheckId).HasColumnName("visibility_check_id");
        builder.HasIndex(x => x.TrackerConfigurationId);
    }
}
