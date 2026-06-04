using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class MentionAttributeConfiguration : IEntityTypeConfiguration<MentionAttribute>
{
    public void Configure(EntityTypeBuilder<MentionAttribute> builder)
    {
        builder.ToTable("mention_attributes");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.MentionId).HasColumnName("mention_id");
        builder.Property(a => a.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(a => a.Polarity).HasColumnName("polarity")
            .HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.EvidenceSnippet).HasColumnName("evidence_snippet")
            .HasMaxLength(500);
        builder.Property(a => a.ConfidenceScore).HasColumnName("confidence_score");
        builder.Property(a => a.CreatedAt).HasColumnName("created_at");

        builder.HasOne(a => a.Mention).WithMany().HasForeignKey(a => a.MentionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.MentionId);
        // "Show me all mentions tagged with attribute X across the scan"
        // reads filter on attribute name.
        builder.HasIndex(a => a.Name);
    }
}
