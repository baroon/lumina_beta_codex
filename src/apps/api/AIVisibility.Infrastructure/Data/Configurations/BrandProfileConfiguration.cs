using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class BrandProfileConfiguration : IEntityTypeConfiguration<BrandProfile>
{
    public void Configure(EntityTypeBuilder<BrandProfile> builder)
    {
        builder.ToTable("brand_profiles");
        builder.HasKey(bp => bp.Id);
        builder.Property(bp => bp.Id).HasColumnName("id");
        builder.Property(bp => bp.BrandId).HasColumnName("brand_id");
        builder.Property(bp => bp.ShortDescription).HasColumnName("short_description").HasMaxLength(1000);
        builder.Property(bp => bp.Industry).HasColumnName("industry").HasMaxLength(200);
        builder.Property(bp => bp.Category).HasColumnName("category").HasMaxLength(200);
        builder.Property(bp => bp.Positioning).HasColumnName("positioning").HasMaxLength(2000);
        builder.Property(bp => bp.Confidence).HasColumnName("confidence");
        builder.Property(bp => bp.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(bp => bp.DiscoveryRunId).HasColumnName("discovery_run_id");
        builder.Property(bp => bp.CreatedAt).HasColumnName("created_at");
        builder.Property(bp => bp.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne(bp => bp.DiscoveryRun).WithMany().HasForeignKey(bp => bp.DiscoveryRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(bp => bp.BrandId).IsUnique();
        builder.HasIndex(bp => bp.DiscoveryRunId);
    }
}
