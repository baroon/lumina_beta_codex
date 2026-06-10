using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptTemplateConfiguration : IEntityTypeConfiguration<PromptTemplate>
{
    // Visibility Lens ids (see LensConfiguration seed).
    private static readonly Guid Discovery = new("c0000000-0000-0000-0000-000000000001");
    private static readonly Guid BuyingIntent = new("c0000000-0000-0000-0000-000000000002");
    private static readonly Guid CompetitorComparison = new("c0000000-0000-0000-0000-000000000003");
    private static readonly Guid SentimentAndTrust = new("c0000000-0000-0000-0000-000000000004");
    private static readonly Guid CitationVisibility = new("c0000000-0000-0000-0000-000000000005");
    private static readonly Guid ContentGaps = new("c0000000-0000-0000-0000-000000000006");

    // Fixed timestamp for the initial seed batch. New rows added later should
    // carry their own batch date so the lineage stays inspectable.
    private static readonly DateTime InitialSeedAt = new(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);

    public void Configure(EntityTypeBuilder<PromptTemplate> builder)
    {
        builder.ToTable("prompt_templates");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.LensId).HasColumnName("lens_id");
        builder.Property(t => t.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(t => t.TemplateText).HasColumnName("template_text").HasMaxLength(2000).IsRequired();
        builder.Property(t => t.IsActive).HasColumnName("is_active");
        builder.Property(t => t.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(t => t.LensId);

        // No-nav FK to lenses: templates must reference a real lens; lenses
        // are seed reference data so RESTRICT, not Cascade.
        builder.HasOne<Lens>()
            .WithMany()
            .HasForeignKey(t => t.LensId)
            .OnDelete(DeleteBehavior.Restrict);

        // Starter prompt library (ADR-002 §5): 3 example phrasings per Visibility Lens. These are
        // style anchors for the LLM generator and fill-ins for the deterministic fallback.
        builder.HasData(
            // Discovery
            Template("70000000-0000-0000-0000-000000000101", Discovery, "Category discovery",
                "What are the best {category} options in {market}?"),
            Template("70000000-0000-0000-0000-000000000102", Discovery, "Category recommendation",
                "Which {category} would you recommend in {market}?"),
            Template("70000000-0000-0000-0000-000000000103", Discovery, "Leading providers",
                "Who are the leading {category} providers right now?"),
            // Buying Intent
            Template("70000000-0000-0000-0000-000000000201", BuyingIntent, "Buying intent",
                "I want to buy {category} for {topic} — which do you recommend?"),
            Template("70000000-0000-0000-0000-000000000202", BuyingIntent, "Budget choice",
                "What's the best {category} for {topic} on a budget?"),
            Template("70000000-0000-0000-0000-000000000203", BuyingIntent, "Ready to choose",
                "I'm ready to choose a {category} for {topic} — what should I go with?"),
            // Competitor Comparison
            Template("70000000-0000-0000-0000-000000000301", CompetitorComparison, "Head to head",
                "How does {brand} compare to {competitor} for {category}?"),
            Template("70000000-0000-0000-0000-000000000302", CompetitorComparison, "Which is better",
                "Is {brand} or {competitor} the better {category}?"),
            Template("70000000-0000-0000-0000-000000000303", CompetitorComparison, "Key differences",
                "What are the main differences between {brand} and {competitor}?"),
            // Sentiment & Trust
            Template("70000000-0000-0000-0000-000000000401", SentimentAndTrust, "Reliability",
                "Is {brand} a reliable {category}? What is its reputation?"),
            Template("70000000-0000-0000-0000-000000000402", SentimentAndTrust, "Reviews",
                "What do people say about {brand}?"),
            Template("70000000-0000-0000-0000-000000000403", SentimentAndTrust, "Trust",
                "Can I trust {brand} for {category}?"),
            // Citation Visibility
            Template("70000000-0000-0000-0000-000000000501", CitationVisibility, "Authoritative sources",
                "What are the most authoritative sources about {topic} in {category}?"),
            Template("70000000-0000-0000-0000-000000000502", CitationVisibility, "Experts to follow",
                "Which experts or publications should I follow on {topic}?"),
            Template("70000000-0000-0000-0000-000000000503", CitationVisibility, "Trustworthy info",
                "Where can I find trustworthy information about {topic}?"),
            // Content Gaps
            Template("70000000-0000-0000-0000-000000000601", ContentGaps, "Considerations",
                "What should I consider about {topic} when choosing a {category}?"),
            Template("70000000-0000-0000-0000-000000000602", ContentGaps, "Questions to ask",
                "What questions should I ask about {topic} before choosing a {category}?"),
            Template("70000000-0000-0000-0000-000000000603", ContentGaps, "Overlooked factors",
                "What do most people overlook about {topic} when it comes to {category}?")
        );
    }

    private static PromptTemplate Template(string id, Guid checkId, string name, string text) =>
        new()
        {
            Id = new Guid(id),
            LensId = checkId,
            Name = name,
            TemplateText = text,
            IsActive = true,
            CreatedAt = InitialSeedAt,
        };
}
