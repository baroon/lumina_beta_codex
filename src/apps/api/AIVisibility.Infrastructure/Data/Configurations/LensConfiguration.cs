using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class LensConfiguration : IEntityTypeConfiguration<Lens>
{
    public void Configure(EntityTypeBuilder<Lens> builder)
    {
        builder.ToTable("lenses");
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasColumnName("id");
        builder.Property(v => v.Code).HasColumnName("code").HasMaxLength(100).IsRequired();
        builder.Property(v => v.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(v => v.Description).HasColumnName("description").HasMaxLength(1000).IsRequired();
        builder.Property(v => v.DisplayOrder).HasColumnName("display_order");
        builder.HasIndex(v => v.Code).IsUnique();
        builder.HasIndex(v => v.DisplayOrder).IsUnique();

        // V1 Visibility Lenses (ADR-001) — static seed data.
        builder.HasData(
            new Lens
            {
                Id = new Guid("c0000000-0000-0000-0000-000000000001"),
                Code = "Discovery",
                Name = "Discovery",
                Description = "Does the AI surface the brand when asked about the category or topic?",
                DisplayOrder = 1,
            },
            new Lens
            {
                Id = new Guid("c0000000-0000-0000-0000-000000000002"),
                Code = "BuyingIntent",
                Name = "Buying Intent",
                Description = "Is the brand recommended for high-intent, purchase-oriented prompts?",
                DisplayOrder = 2,
            },
            new Lens
            {
                Id = new Guid("c0000000-0000-0000-0000-000000000003"),
                Code = "CompetitorComparison",
                Name = "Competitor Comparison",
                Description = "How does the AI compare the brand against its competitors?",
                DisplayOrder = 3,
            },
            new Lens
            {
                Id = new Guid("c0000000-0000-0000-0000-000000000004"),
                Code = "SentimentAndTrust",
                Name = "Sentiment & Trust",
                Description = "What sentiment and trust signals does the AI express about the brand?",
                DisplayOrder = 4,
            },
            new Lens
            {
                Id = new Guid("c0000000-0000-0000-0000-000000000005"),
                Code = "CitationVisibility",
                Name = "Citation Visibility",
                Description = "Is the brand's own content cited as a source in AI answers?",
                DisplayOrder = 5,
            },
            new Lens
            {
                Id = new Guid("c0000000-0000-0000-0000-000000000006"),
                Code = "ContentGaps",
                Name = "Content Gaps",
                Description = "Where is the brand absent from AI answers when it should be present?",
                DisplayOrder = 6,
            }
        );
    }
}
