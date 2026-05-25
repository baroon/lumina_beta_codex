using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerVisibilityLensConfiguration : IEntityTypeConfiguration<TrackerVisibilityLens>
{
    public void Configure(EntityTypeBuilder<TrackerVisibilityLens> builder)
    {
        builder.ToTable("tracker_visibility_lenses");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.VisibilityLensId).HasColumnName("visibility_lens_id");
        builder.HasIndex(x => x.TrackerConfigurationId);
    }
}
