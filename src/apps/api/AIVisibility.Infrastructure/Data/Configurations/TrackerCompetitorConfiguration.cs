using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerCompetitorConfiguration : IEntityTypeConfiguration<TrackerCompetitor>
{
    public void Configure(EntityTypeBuilder<TrackerCompetitor> builder)
    {
        builder.ToTable("tracker_competitors");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.CompetitorId).HasColumnName("competitor_id");
        builder.HasIndex(x => x.TrackerConfigurationId);
    }
}
