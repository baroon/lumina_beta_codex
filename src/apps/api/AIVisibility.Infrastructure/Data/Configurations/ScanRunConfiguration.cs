using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class ScanRunConfiguration : IEntityTypeConfiguration<ScanRun>
{
    public void Configure(EntityTypeBuilder<ScanRun> builder)
    {
        builder.ToTable("scan_runs");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(r => r.TriggerType).HasColumnName("trigger_type").HasConversion<string>().HasMaxLength(50);
        builder.Property(r => r.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
        builder.Property(r => r.PromptCount).HasColumnName("prompt_count");
        builder.Property(r => r.PlatformCount).HasColumnName("platform_count");
        builder.Property(r => r.ScanCheckCount).HasColumnName("scan_check_count");
        builder.Property(r => r.CompletedCount).HasColumnName("completed_count");
        builder.Property(r => r.FailedCount).HasColumnName("failed_count");
        builder.Property(r => r.StartedAt).HasColumnName("started_at");
        builder.Property(r => r.CompletedAt).HasColumnName("completed_at");

        builder.HasOne(r => r.TrackerConfiguration).WithMany().HasForeignKey(r => r.TrackerConfigurationId);
        builder.HasMany(r => r.PromptRuns).WithOne(p => p.ScanRun).HasForeignKey(p => p.ScanRunId);

        builder.HasIndex(r => r.TrackerConfigurationId);
        builder.HasIndex(r => r.Status);
    }
}
