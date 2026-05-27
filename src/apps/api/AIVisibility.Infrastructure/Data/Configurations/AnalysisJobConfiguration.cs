using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class AnalysisJobConfiguration : IEntityTypeConfiguration<AnalysisJob>
{
    public void Configure(EntityTypeBuilder<AnalysisJob> builder)
    {
        builder.ToTable("analysis_jobs");
        builder.HasKey(j => j.Id);
        builder.Property(j => j.Id).HasColumnName("id");
        builder.Property(j => j.ScanRunId).HasColumnName("scan_run_id");
        builder.Property(j => j.Status).HasColumnName("status")
            .HasConversion<string>().HasMaxLength(50);

        builder.Property(j => j.ExtractStartedAt).HasColumnName("extract_started_at");
        builder.Property(j => j.ExtractCompletedAt).HasColumnName("extract_completed_at");
        builder.Property(j => j.AggregateStartedAt).HasColumnName("aggregate_started_at");
        builder.Property(j => j.AggregateCompletedAt).HasColumnName("aggregate_completed_at");

        builder.Property(j => j.ErrorMessage).HasColumnName("error_message").HasMaxLength(2000);
        builder.Property(j => j.CreatedAt).HasColumnName("created_at");

        builder.HasOne(j => j.ScanRun).WithMany().HasForeignKey(j => j.ScanRunId);

        // One job per scan (no reprocessing in v1 — D4).
        builder.HasIndex(j => j.ScanRunId).IsUnique();
        builder.HasIndex(j => j.Status);
    }
}
