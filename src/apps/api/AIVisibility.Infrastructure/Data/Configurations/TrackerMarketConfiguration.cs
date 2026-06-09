using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerMarketConfiguration : IEntityTypeConfiguration<TrackerMarket>
{
    public void Configure(EntityTypeBuilder<TrackerMarket> builder)
    {
        builder.ToTable("tracker_markets");
        builder.HasKey(x => new { x.TrackerConfigurationId, x.MarketId });
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.MarketId).HasColumnName("market_id");
        builder.HasIndex(x => x.MarketId);

        builder.HasOne<Market>()
            .WithMany()
            .HasForeignKey(x => x.MarketId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
