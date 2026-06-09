using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class SourceTypeReferenceConfiguration : IEntityTypeConfiguration<SourceTypeReference>
{
    public void Configure(EntityTypeBuilder<SourceTypeReference> builder)
    {
        builder.ToTable("source_types");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");

        builder.Property(s => s.Code).HasColumnName("code")
            .HasMaxLength(50).IsRequired();
        builder.Property(s => s.Name).HasColumnName("name")
            .HasMaxLength(100).IsRequired();
        builder.Property(s => s.Description).HasColumnName("description")
            .HasMaxLength(500).IsRequired();
        builder.Property(s => s.DisplayOrder).HasColumnName("display_order");

        builder.HasIndex(s => s.Code).IsUnique();

        // 12-value source-type taxonomy (ADR-003). Static seed data; codes
        // match the SourceType enum's ToString().
        builder.HasData(
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000001"),
                Code = "Owned",
                Name = "Owned",
                Description = "The brand's own website, documentation, or properties.",
                DisplayOrder = 1,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000002"),
                Code = "Competitor",
                Name = "Competitor",
                Description = "A tracked competitor's website or properties.",
                DisplayOrder = 2,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000003"),
                Code = "Corporate",
                Name = "Corporate",
                Description = "Other company or business websites that aren't the brand or a tracked competitor.",
                DisplayOrder = 3,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000004"),
                Code = "UGC",
                Name = "User-Generated Content",
                Description = "Forums, Q&A sites, and community platforms such as Reddit, Quora, and Stack Exchange.",
                DisplayOrder = 4,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000005"),
                Code = "Editorial",
                Name = "Editorial",
                Description = "News organizations, magazines, and journalism sites.",
                DisplayOrder = 5,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000006"),
                Code = "ReviewSite",
                Name = "Review Site",
                Description = "Dedicated review aggregators and rating platforms such as G2, Capterra, and Trustpilot.",
                DisplayOrder = 6,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000007"),
                Code = "Social",
                Name = "Social",
                Description = "Social media platforms such as LinkedIn, Twitter/X, and Facebook.",
                DisplayOrder = 7,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000008"),
                Code = "Institutional",
                Name = "Institutional",
                Description = "Universities, government, and non-profit organizations (.edu, .gov, NGOs).",
                DisplayOrder = 8,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000009"),
                Code = "Reference",
                Name = "Reference",
                Description = "Encyclopedias, knowledge bases, and glossaries such as Wikipedia and MDN.",
                DisplayOrder = 9,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000010"),
                Code = "Marketplace",
                Name = "Marketplace",
                Description = "E-commerce platforms and product listing services such as Amazon and app stores.",
                DisplayOrder = 10,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000011"),
                Code = "Other",
                Name = "Other",
                Description = "Sources that don't fit any of the more specific categories.",
                DisplayOrder = 11,
            },
            new SourceTypeReference
            {
                Id = new Guid("d0000000-0000-0000-0000-000000000012"),
                Code = "Unknown",
                Name = "Unknown",
                Description = "Source type could not be determined by the classifier.",
                DisplayOrder = 12,
            }
        );
    }
}
