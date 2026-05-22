using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptTemplateConfiguration : IEntityTypeConfiguration<PromptTemplate>
{
    // Visibility Check ids (see VisibilityCheckConfiguration seed).
    private static readonly Guid Discovery = new("c0000000-0000-0000-0000-000000000001");
    private static readonly Guid BuyingIntent = new("c0000000-0000-0000-0000-000000000002");
    private static readonly Guid CompetitorComparison = new("c0000000-0000-0000-0000-000000000003");
    private static readonly Guid SentimentAndTrust = new("c0000000-0000-0000-0000-000000000004");
    private static readonly Guid CitationVisibility = new("c0000000-0000-0000-0000-000000000005");
    private static readonly Guid ContentGaps = new("c0000000-0000-0000-0000-000000000006");

    public void Configure(EntityTypeBuilder<PromptTemplate> builder)
    {
        builder.ToTable("prompt_templates");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.VisibilityCheckId).HasColumnName("visibility_check_id");
        builder.Property(t => t.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(t => t.TemplateText).HasColumnName("template_text").HasMaxLength(2000).IsRequired();
        builder.Property(t => t.DisplayOrder).HasColumnName("display_order");
        builder.HasIndex(t => t.VisibilityCheckId);

        // Starter prompt library (ADR-002 §5). Placeholders are filled during generation.
        builder.HasData(
            new PromptTemplate
            {
                Id = new Guid("70000000-0000-0000-0000-000000000001"),
                VisibilityCheckId = Discovery,
                Name = "Category discovery",
                TemplateText = "What are the best {category} options in {market}?",
                DisplayOrder = 1,
            },
            new PromptTemplate
            {
                Id = new Guid("70000000-0000-0000-0000-000000000002"),
                VisibilityCheckId = BuyingIntent,
                Name = "Buying intent",
                TemplateText = "I want to buy {category} for {topic} — which do you recommend?",
                DisplayOrder = 2,
            },
            new PromptTemplate
            {
                Id = new Guid("70000000-0000-0000-0000-000000000003"),
                VisibilityCheckId = CompetitorComparison,
                Name = "Competitor comparison",
                TemplateText = "How does {brand} compare to {competitor} for {category}?",
                DisplayOrder = 3,
            },
            new PromptTemplate
            {
                Id = new Guid("70000000-0000-0000-0000-000000000004"),
                VisibilityCheckId = SentimentAndTrust,
                Name = "Sentiment & trust",
                TemplateText = "Is {brand} a reliable {category}? What is its reputation?",
                DisplayOrder = 4,
            },
            new PromptTemplate
            {
                Id = new Guid("70000000-0000-0000-0000-000000000005"),
                VisibilityCheckId = CitationVisibility,
                Name = "Citation visibility",
                TemplateText = "What are the most authoritative sources about {topic} in {category}?",
                DisplayOrder = 5,
            },
            new PromptTemplate
            {
                Id = new Guid("70000000-0000-0000-0000-000000000006"),
                VisibilityCheckId = ContentGaps,
                Name = "Content gaps",
                TemplateText = "What should I consider about {topic} when choosing a {category}?",
                DisplayOrder = 6,
            }
        );
    }
}
