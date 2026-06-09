using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerCompetitorConfiguration : IEntityTypeConfiguration<TrackerCompetitor>
{
    public void Configure(EntityTypeBuilder<TrackerCompetitor> builder)
    {
        builder.ToTable("tracker_competitors");
        builder.HasKey(x => new { x.TrackerConfigurationId, x.CompetitorId });
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.CompetitorId).HasColumnName("competitor_id");
        builder.HasIndex(x => x.CompetitorId);

        builder.HasOne<Competitor>()
            .WithMany()
            .HasForeignKey(x => x.CompetitorId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
