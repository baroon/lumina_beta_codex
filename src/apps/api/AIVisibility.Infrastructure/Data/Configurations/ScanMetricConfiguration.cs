using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class ScanMetricConfiguration : IEntityTypeConfiguration<ScanMetric>
{
    public void Configure(EntityTypeBuilder<ScanMetric> builder)
    {
        builder.ToTable("scan_metrics", t =>
        {
            // D15: scope_id MUST be null for Overall and non-null for every
            // other scope. DB-level guard so a buggy aggregator can't poison
            // the table with invalid rows.
            t.HasCheckConstraint(
                "chk_scan_metrics_scope_id_nullability",
                "(scope = 'Overall') = (scope_id IS NULL)");
        });

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");
        builder.Property(m => m.ScanRunId).HasColumnName("scan_run_id");

        builder.Property(m => m.Scope).HasColumnName("scope")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(m => m.ScopeId).HasColumnName("scope_id");

        builder.Property(m => m.MetricName).HasColumnName("metric_name")
            .HasMaxLength(100).IsRequired();
        builder.Property(m => m.MetricValue).HasColumnName("metric_value");

        builder.Property(m => m.MetadataJson).HasColumnName("metadata_json")
            .HasColumnType("jsonb");

        builder.Property(m => m.CreatedAt).HasColumnName("created_at");

        builder.HasOne(m => m.ScanRun).WithMany().HasForeignKey(m => m.ScanRunId);

        builder.HasIndex(m => m.ScanRunId);
        // "Get all X-metric values for this scan across all scopes" — primary
        // reporting query shape per ADR-003.
        builder.HasIndex(m => new { m.ScanRunId, m.Scope, m.MetricName })
            .HasDatabaseName("IX_scan_metrics_lookup");
        // "All metrics for this competitor / lens / etc" — drill-down query.
        builder.HasIndex(m => new { m.Scope, m.ScopeId });
    }
}
