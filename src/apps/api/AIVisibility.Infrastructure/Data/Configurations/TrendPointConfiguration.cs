using AIVisibility.Domain.Entities;
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
        builder.Property(t => t.MetricName).HasColumnName("metric_name").HasMaxLength(100).IsRequired();
        builder.Property(t => t.NumericValue).HasColumnName("numeric_value");
        builder.Property(t => t.CategoricalValue).HasColumnName("categorical_value").HasMaxLength(100);
        builder.Property(t => t.CapturedAt).HasColumnName("captured_at");
        builder.Property(t => t.CreatedAt).HasColumnName("created_at");

        // Window-scan query — by tracker, sorted by captured_at.
        builder.HasIndex(t => new { t.TrackerConfigurationId, t.CapturedAt });
        // Defense against duplicate writes if aggregation re-runs on the same
        // scan (shouldn't happen with the current pipeline, but cheap insurance).
        builder.HasIndex(t => new { t.TrackerConfigurationId, t.ScanRunId, t.MetricName }).IsUnique();
    }
}
