using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerAudienceConfiguration : IEntityTypeConfiguration<TrackerAudience>
{
    public void Configure(EntityTypeBuilder<TrackerAudience> builder)
    {
        builder.ToTable("tracker_audiences");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.AudienceId).HasColumnName("audience_id");
        builder.HasIndex(x => x.TrackerConfigurationId);
    }
}
