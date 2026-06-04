using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MentionComparisonConfiguration : IEntityTypeConfiguration<MentionComparison>
{
    public void Configure(EntityTypeBuilder<MentionComparison> builder)
    {
        builder.ToTable("mention_comparisons");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.MentionId).HasColumnName("mention_id");

        builder.Property(c => c.VsEntityName).HasColumnName("vs_entity_name")
            .HasMaxLength(500).IsRequired();
        builder.Property(c => c.VsEntityNormalized).HasColumnName("vs_entity_normalized")
            .HasMaxLength(500).IsRequired();
        builder.Property(c => c.OnAspect).HasColumnName("on_aspect")
            .HasMaxLength(100).IsRequired();
        builder.Property(c => c.WinnerIsThisMention).HasColumnName("winner_is_this_mention");
        builder.Property(c => c.EvidenceSnippet).HasColumnName("evidence_snippet")
            .HasMaxLength(500);
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");

        builder.HasOne(c => c.Mention).WithMany().HasForeignKey(c => c.MentionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.MentionId);
        builder.HasIndex(c => c.VsEntityNormalized);
        builder.HasIndex(c => c.OnAspect);
    }
}
