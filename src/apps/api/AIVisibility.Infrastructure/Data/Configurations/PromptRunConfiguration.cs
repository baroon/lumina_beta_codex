using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptRunConfiguration : IEntityTypeConfiguration<PromptRun>
{
    public void Configure(EntityTypeBuilder<PromptRun> builder)
    {
        builder.ToTable("prompt_runs");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.ScanRunId).HasColumnName("scan_run_id");
        builder.Property(p => p.PromptId).HasColumnName("prompt_id");
        builder.Property(p => p.AIPlatformId).HasColumnName("ai_platform_id");
        builder.Property(p => p.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.StartedAt).HasColumnName("started_at");
        builder.Property(p => p.CompletedAt).HasColumnName("completed_at");
        builder.Property(p => p.ErrorMessage).HasColumnName("error_message").HasMaxLength(2000);

        builder.HasOne(p => p.Answer).WithOne(a => a.PromptRun).HasForeignKey<AIAnswer>(a => a.PromptRunId);

        // FKs to Prompt and AIPlatform use RESTRICT so hard-deleting either
        // would block while prompt_runs reference them. The application path
        // is soft-archive (Prompt.Status = Archived; platforms are reference
        // data) — this constraint catches any accidental hard-delete.
        builder.HasOne(p => p.Prompt).WithMany().HasForeignKey(p => p.PromptId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(p => p.AIPlatform).WithMany().HasForeignKey(p => p.AIPlatformId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.ScanRunId);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.PromptId);
        builder.HasIndex(p => p.AIPlatformId);
    }
}
