using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerProductConfiguration : IEntityTypeConfiguration<TrackerProduct>
{
    public void Configure(EntityTypeBuilder<TrackerProduct> builder)
    {
        builder.ToTable("tracker_products");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(x => x.ProductId).HasColumnName("product_id");
        builder.HasIndex(x => x.TrackerConfigurationId);
    }
}
