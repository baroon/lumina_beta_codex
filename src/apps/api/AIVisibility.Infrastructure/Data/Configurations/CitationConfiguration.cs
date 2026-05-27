using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class CitationConfiguration : IEntityTypeConfiguration<Citation>
{
    public void Configure(EntityTypeBuilder<Citation> builder)
    {
        builder.ToTable("citations");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.AIAnswerId).HasColumnName("ai_answer_id");

        builder.Property(c => c.SourceName).HasColumnName("source_name")
            .HasMaxLength(500).IsRequired();
        builder.Property(c => c.NormalizedSourceName).HasColumnName("normalized_source_name")
            .HasMaxLength(500).IsRequired();

        builder.Property(c => c.Url).HasColumnName("url").HasMaxLength(2048);
        builder.Property(c => c.NormalizedDomain).HasColumnName("normalized_domain").HasMaxLength(500);

        builder.Property(c => c.Classification).HasColumnName("classification")
            .HasConversion<string>().HasMaxLength(50);
        builder.Property(c => c.CitationType).HasColumnName("citation_type")
            .HasConversion<string>().HasMaxLength(50);

        builder.Property(c => c.ConfidenceScore).HasColumnName("confidence_score");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");

        builder.HasOne(c => c.AIAnswer).WithMany().HasForeignKey(c => c.AIAnswerId);

        builder.HasIndex(c => c.AIAnswerId);
        builder.HasIndex(c => c.NormalizedSourceName);
        builder.HasIndex(c => c.Classification);
    }
}
