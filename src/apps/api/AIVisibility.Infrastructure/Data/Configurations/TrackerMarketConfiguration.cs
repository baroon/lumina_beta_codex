using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerMarketConfiguration : IEntityTypeConfiguration<TrackerMarket>
{
    public void Configure(EntityTypeBuilder<TrackerMarket> builder)
    {
        builder.ToTable("tracker_markets");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.MarketId).HasColumnName("market_id");
        builder.HasIndex(x => x.TrackerConfigurationId);
    }
}
