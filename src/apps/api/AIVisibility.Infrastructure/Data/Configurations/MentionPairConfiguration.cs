using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MentionPairConfiguration : IEntityTypeConfiguration<MentionPair>
{
    public void Configure(EntityTypeBuilder<MentionPair> builder)
    {
        builder.ToTable("mention_pairs");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.AIAnswerId).HasColumnName("ai_answer_id");
        builder.Property(p => p.MentionAId).HasColumnName("mention_a_id");
        builder.Property(p => p.MentionBId).HasColumnName("mention_b_id");
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");

        builder.HasOne(p => p.AIAnswer).WithMany().HasForeignKey(p => p.AIAnswerId);
        // Both sides cascade on Postgres — symmetric so deleting either
        // participant mention also wipes the pair row. EF's default of
        // NoAction on the second FK exists for SQL Server's multiple-cascade-
        // paths restriction, which Postgres doesn't have.
        builder.HasOne(p => p.MentionA).WithMany().HasForeignKey(p => p.MentionAId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(p => p.MentionB).WithMany().HasForeignKey(p => p.MentionBId)
            .OnDelete(DeleteBehavior.Cascade);

        // "Who has X been co-mentioned with?" reads filter on one side at a time.
        builder.HasIndex(p => p.MentionAId);
        builder.HasIndex(p => p.MentionBId);
        builder.HasIndex(p => p.AIAnswerId);
        // Same unordered pair stored only once per answer.
        builder.HasIndex(p => new { p.AIAnswerId, p.MentionAId, p.MentionBId }).IsUnique();
    }
}
