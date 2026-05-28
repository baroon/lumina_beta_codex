using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrendPointConfiguration : IEntityTypeConfiguration<TrendPoint>
{
    public void Configure(EntityTypeBuilder<TrendPoint> builder)
    {
        builder.ToTable("trend_points");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(t => t.ScanRunId).HasColumnName("scan_run_id");

        // Polymorphic entity discriminator (Phase 4 v2 D1). NOT NULL on both
        // columns — see memory `data-integrity-no-compat-shims`. Stored as
        // string for consistency with the codebase's other enum-as-varchar
        // pattern (SourceType, ClassificationStatus, etc.).
        builder.Property(t => t.EntityType)
            .HasColumnName("entity_type")
            .HasMaxLength(50)
            .HasConversion<string>()
            .IsRequired();
        builder.Property(t => t.EntityId)
            .HasColumnName("entity_id")
            .IsRequired();

        builder.Property(t => t.MetricName).HasColumnName("metric_name").HasMaxLength(100).IsRequired();
        builder.Property(t => t.NumericValue).HasColumnName("numeric_value");
        builder.Property(t => t.CategoricalValue).HasColumnName("categorical_value").HasMaxLength(100);
        builder.Property(t => t.CapturedAt).HasColumnName("captured_at");
        builder.Property(t => t.CreatedAt).HasColumnName("created_at");

        // Window-scan query — by tracker, sorted by captured_at.
        builder.HasIndex(t => new { t.TrackerConfigurationId, t.CapturedAt });
        // Uniqueness now includes entity — a scan writes one row per
        // (entity × metric) so the dashboard chart can render one series per
        // tracked brand/competitor.
        builder.HasIndex(t => new { t.TrackerConfigurationId, t.ScanRunId, t.EntityType, t.EntityId, t.MetricName }).IsUnique();
    }
}
