using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MentionRiskFlagConfiguration : IEntityTypeConfiguration<MentionRiskFlag>
{
    public void Configure(EntityTypeBuilder<MentionRiskFlag> builder)
    {
        builder.ToTable("mention_risk_flags");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.MentionId).HasColumnName("mention_id");

        builder.Property(r => r.FlagType).HasColumnName("flag_type")
            .HasMaxLength(100).IsRequired();
        builder.Property(r => r.Severity).HasColumnName("severity")
            .HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.EvidenceSnippet).HasColumnName("evidence_snippet")
            .HasMaxLength(500);
        builder.Property(r => r.CreatedAt).HasColumnName("created_at");

        builder.HasOne(r => r.Mention).WithMany().HasForeignKey(r => r.MentionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.MentionId);
        builder.HasIndex(r => r.FlagType);
    }
}
