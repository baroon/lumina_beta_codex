using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerLensConfiguration : IEntityTypeConfiguration<TrackerLens>
{
    public void Configure(EntityTypeBuilder<TrackerLens> builder)
    {
        builder.ToTable("tracker_lenses");
        builder.HasKey(x => new { x.TrackerConfigurationId, x.LensId });
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.LensId).HasColumnName("lens_id");
        builder.HasIndex(x => x.LensId);

        builder.HasOne<Lens>()
            .WithMany()
            .HasForeignKey(x => x.LensId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
